import "server-only";
import {
  default as makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import pino from "pino";
import qrcode from "qrcode";
import { prisma } from "@/lib/db";
import { analyzeMessage } from "@/lib/ai/openai-client";

type ClientState = {
  socket?: WASocket;
  status: "disconnected" | "connecting" | "connected";
  qrDataUrl?: string;
  qrRaw?: string;
  lastError?: string;
  lastUpdate?: number;
  phone?: string;
};

// Persistir el Map en globalThis para sobrevivir a HMR de Next.js dev mode.
// Sin esto, cada vez que se compila una ruta API el módulo se recarga y
// perdemos el cliente conectado.
const globalForBaileys = globalThis as unknown as {
  __baileysClients?: Map<string, ClientState>;
};
const clients: Map<string, ClientState> =
  globalForBaileys.__baileysClients ?? new Map<string, ClientState>();
if (process.env.NODE_ENV !== "production") {
  globalForBaileys.__baileysClients = clients;
}

// Logger visible para warnings/errores (no inundamos con info)
const logger = pino({ level: "warn" });

const AUTH_DIR_BASE = path.join(process.cwd(), "baileys-auth");

function authDirFor(tenantId: string) {
  const dir = path.join(AUTH_DIR_BASE, tenantId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getClientState(tenantId: string): ClientState {
  return clients.get(tenantId) ?? { status: "disconnected" };
}

export async function disconnectClient(tenantId: string) {
  const state = clients.get(tenantId);
  if (state?.socket) {
    try {
      await state.socket.logout();
    } catch {
      // ignore
    }
    try {
      state.socket.end(undefined);
    } catch {
      // ignore
    }
  }
  clients.set(tenantId, { status: "disconnected" });
  const dir = authDirFor(tenantId);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function startClient(tenantId: string) {
  const existing = clients.get(tenantId);
  // Si ya está conectado o ya tiene un QR válido reciente, lo devolvemos
  if (existing) {
    if (existing.status === "connected") return existing;
    if (existing.status === "connecting" && existing.qrDataUrl) return existing;
    // Si está "connecting" sin QR por más de 30s, asumimos que se atoró y reiniciamos
    if (
      existing.status === "connecting" &&
      existing.lastUpdate &&
      Date.now() - existing.lastUpdate < 30_000
    ) {
      return existing;
    }
  }

  console.log(`[baileys] Iniciando sesión para tenant=${tenantId}`);

  // Limpiar estado anterior si lo había
  if (existing?.socket) {
    try {
      existing.socket.end(undefined);
    } catch {
      // ignore
    }
  }

  const state: ClientState = {
    status: "connecting",
    lastUpdate: Date.now(),
  };
  clients.set(tenantId, state);

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(
      authDirFor(tenantId)
    );

    let version: [number, number, number] | undefined;
    try {
      const fetched = await fetchLatestBaileysVersion();
      version = fetched.version;
      console.log(`[baileys] Usando WhatsApp Web v${version.join(".")}`);
    } catch (err) {
      console.warn(
        "[baileys] No se pudo obtener versión más reciente, usando default:",
        (err as Error).message
      );
    }

    const sock = makeWASocket({
      auth: authState,
      logger,
      browser: ["WhatsPyme", "Chrome", "120.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      ...(version ? { version } : {}),
    });

    state.socket = sock;
    state.lastUpdate = Date.now();
    clients.set(tenantId, state);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const current = clients.get(tenantId) ?? state;
      current.lastUpdate = Date.now();

      console.log(
        `[baileys][${tenantId}] connection.update:`,
        JSON.stringify({
          connection,
          hasQr: !!qr,
          errCode: (lastDisconnect?.error as Boom)?.output?.statusCode,
          errMsg: (lastDisconnect?.error as Error)?.message,
        })
      );

      if (qr) {
        try {
          const dataUrl = await qrcode.toDataURL(qr, { margin: 1, scale: 6 });
          current.qrDataUrl = dataUrl;
          current.qrRaw = qr;
          current.status = "connecting";
          current.lastError = undefined;
          clients.set(tenantId, current);
          console.log(`[baileys][${tenantId}] QR generado (${qr.length} chars)`);
        } catch (err) {
          current.lastError = `Error generando QR: ${(err as Error).message}`;
          clients.set(tenantId, current);
          console.error("[baileys] Error qrcode.toDataURL:", err);
        }
      }

      if (connection === "open") {
        current.status = "connected";
        current.qrDataUrl = undefined;
        current.qrRaw = undefined;
        current.lastError = undefined;
        current.phone = sock.user?.id?.split(":")[0]?.split("@")[0];
        clients.set(tenantId, current);
        console.log(`[baileys][${tenantId}] CONECTADO. Phone=${current.phone}`);

        try {
          await prisma.channel.upsert({
            where: { id: `${tenantId}-whatsapp-main` },
            update: {
              status: "connected",
              identifier: current.phone ?? "unknown",
            },
            create: {
              id: `${tenantId}-whatsapp-main`,
              tenantId,
              type: "whatsapp",
              identifier: current.phone ?? "unknown",
              status: "connected",
            },
          });
        } catch (err) {
          console.error("[baileys] error al actualizar channel:", err);
        }
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = code === DisconnectReason.loggedOut;
        current.status = "disconnected";
        current.qrDataUrl = undefined;
        current.qrRaw = undefined;
        current.lastError =
          (lastDisconnect?.error as Error)?.message ??
          (isLoggedOut ? "Sesión cerrada desde el teléfono" : "Conexión cerrada");
        clients.set(tenantId, current);

        try {
          await prisma.channel.updateMany({
            where: { tenantId, type: "whatsapp" },
            data: { status: "disconnected" },
          });
        } catch {
          // ignore
        }

        // Reconectar automáticamente salvo logout explícito
        if (!isLoggedOut) {
          console.log(
            `[baileys][${tenantId}] Reconectando en 3s (code=${code})...`
          );
          setTimeout(() => {
            startClient(tenantId).catch((err) =>
              console.error("[baileys] error al reconectar:", err)
            );
          }, 3000);
        } else {
          console.log(`[baileys][${tenantId}] Logout, limpiando auth`);
          try {
            fs.rmSync(authDirFor(tenantId), { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;
      for (const msg of m.messages) {
        try {
          await ingestIncomingMessage(tenantId, msg);
        } catch (err) {
          console.error("[baileys] Error ingest:", err);
        }
      }
    });

    return state;
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[baileys] ERROR fatal al iniciar:", err);
    state.status = "disconnected";
    state.lastError = `No se pudo iniciar: ${msg}`;
    state.lastUpdate = Date.now();
    clients.set(tenantId, state);
    throw err;
  }
}

async function ingestIncomingMessage(tenantId: string, msg: any) {
  if (msg.key.fromMe) return;
  const remoteJid = msg.key.remoteJid as string;
  if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast")
    return;

  const phone = remoteJid.split("@")[0];
  const text =
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    msg.message?.imageMessage?.caption ??
    msg.message?.videoMessage?.caption ??
    (msg.message?.audioMessage ? "[Nota de voz]" : null) ??
    "[Mensaje no soportado]";

  const messageType = msg.message?.audioMessage
    ? "audio"
    : msg.message?.imageMessage
    ? "image"
    : msg.message?.videoMessage
    ? "video"
    : "text";

  const contactName = msg.pushName ?? phone;

  const contact = await prisma.contact.upsert({
    where: { id: `${tenantId}-${phone}` },
    update: { name: contactName },
    create: {
      id: `${tenantId}-${phone}`,
      tenantId,
      name: contactName,
      phone,
    },
  });

  const channel = await prisma.channel.findFirst({
    where: { tenantId, type: "whatsapp" },
  });
  if (!channel) return;

  let conversation = await prisma.conversation.findFirst({
    where: { tenantId, contactId: contact.id, status: { not: "closed" } },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId,
        channelId: channel.id,
        contactId: contact.id,
        status: "open",
        lastMessageAt: new Date(),
        unread: 1,
      },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unread: { increment: 1 } },
    });
  }

  const analysis = await analyzeMessage(text);

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "in",
      type: messageType,
      content: text,
      externalId: msg.key.id,
      sentiment: analysis.sentiment,
      intent: analysis.intent,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      priority: analysis.priority,
      isOpportunity: analysis.isOpportunity,
      opportunityValue: analysis.opportunityValue,
    },
  });
}

export async function sendMessage(
  tenantId: string,
  toPhone: string,
  text: string
) {
  const state = clients.get(tenantId);
  if (!state?.socket || state.status !== "connected") {
    throw new Error("WhatsApp no está conectado");
  }
  const jid = toPhone.includes("@") ? toPhone : `${toPhone}@s.whatsapp.net`;
  await state.socket.sendMessage(jid, { text });
}
