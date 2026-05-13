import { NextRequest, NextResponse } from "next/server";
import { sendMessage, getClientState } from "@/lib/whatsapp/baileys-client";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { conversationId, text } = await req.json();
  if (!conversationId || !text) {
    return NextResponse.json({ error: "conversationId y text requeridos" }, { status: 400 });
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true, channel: true },
  });
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const state = getClientState(DEMO_TENANT_ID);
  let externalId: string | undefined;

  if (state.status === "connected" && conv.channel.type === "whatsapp" && conv.contact.phone) {
    try {
      await sendMessage(DEMO_TENANT_ID, conv.contact.phone, text);
    } catch (err) {
      console.warn("[send] WhatsApp error, guardando mensaje localmente:", (err as Error).message);
    }
  }

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

  return NextResponse.json({ message: msg, deliveredViaWhatsApp: state.status === "connected" });
}
