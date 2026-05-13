import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeMessage } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { conversationId } = await req.json();
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });
  if (!conv) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const lastIncoming = await prisma.message.findFirst({
    where: { conversationId, direction: "in" },
    orderBy: { createdAt: "desc" },
  });

  // Caso 1: hay mensaje del cliente → analizar y responder a ese
  if (lastIncoming?.content) {
    const text = lastIncoming.transcription ?? lastIncoming.content;
    const analysis = await analyzeMessage(text);
    return NextResponse.json({ analysis, basedOn: "incoming", source: text });
  }

  // Caso 2: no hay mensaje entrante → ofrecer apertura cálida personalizada
  const firstName = conv.contact.name.split(" ")[0];
  const opener = {
    intent: "otro" as const,
    sentiment: "neutro" as const,
    priority: "normal" as const,
    isOpportunity: false,
    opportunityValue: null,
    suggestedReply: `¡Hola ${firstName}! Gracias por contactar a La Trattoria 🍕 ¿En qué te podemos ayudar hoy? Tenemos disponibles: pedidos a domicilio, reservas y nuestro menú del día.`,
    tags: ["apertura", "saludo"],
  };
  return NextResponse.json({
    analysis: opener,
    basedOn: "opener",
    notice: "No hay mensaje entrante reciente: se sugiere un mensaje de apertura.",
  });
}
