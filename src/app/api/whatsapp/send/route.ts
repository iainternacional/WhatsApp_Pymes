import { NextRequest, NextResponse } from "next/server";
import { sendMessage, getClientState } from "@/lib/whatsapp/baileys-client";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";

type SendResponse = {
  message: { id: string; content: string; createdAt: Date };
  delivery:
    | { mode: "whatsapp"; externalId: string; jid: string }
    | { mode: "local-only"; reason: string };
};

export async function POST(req: NextRequest) {
  const { conversationId, text } = await req.json();
  if (!conversationId || !text) {
    return NextResponse.json(
      { error: "conversationId y text requeridos" },
      { status: 400 }
    );
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true, channel: true },
  });
  if (!conv) {
    return NextResponse.json(
      { error: "Conversación no encontrada" },
      { status: 404 }
    );
  }

  const state = getClientState(DEMO_TENANT_ID);

  let externalId: string | undefined;
  let deliveryMode: "whatsapp" | "local-only" = "local-only";
  let deliveryReason = "";
  let deliveryJid: string | undefined;

  // Determinamos por qué NO enviamos a WhatsApp si es el caso.
  if (conv.channel.type !== "whatsapp") {
    deliveryReason = `Canal "${conv.channel.type}" aún no soporta envío real desde el MVP.`;
  } else if (state.status !== "connected") {
    deliveryReason =
      "WhatsApp no está conectado. Ve a /dashboard/connect y escanea el QR.";
  } else if (!conv.contact.phone) {
    deliveryReason = "El contacto no tiene número de teléfono asociado.";
  } else {
    try {
      const result = await sendMessage(
        DEMO_TENANT_ID,
        conv.contact.phone,
        text
      );
      externalId = result.externalId;
      deliveryJid = result.jid;
      deliveryMode = "whatsapp";
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(
        `[send] WhatsApp falló para conv=${conversationId} contacto=${conv.contact.phone}: ${msg}`
      );
      deliveryReason = msg;
    }
  }

  // El mensaje siempre se persiste, para que el agente vea su histórico
  // aunque la entrega real haya fallado.
  const msg = await prisma.message.create({
    data: {
      conversationId,
      direction: "out",
      type: "text",
      content: text,
      externalId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date(), unread: 0 },
  });

  const response: SendResponse = {
    message: { id: msg.id, content: msg.content, createdAt: msg.createdAt },
    delivery:
      deliveryMode === "whatsapp"
        ? { mode: "whatsapp", externalId: externalId!, jid: deliveryJid! }
        : { mode: "local-only", reason: deliveryReason },
  };

  return NextResponse.json(response);
}
