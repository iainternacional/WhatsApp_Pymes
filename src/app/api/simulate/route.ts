import { NextRequest, NextResponse } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";
import { analyzeMessage } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

// Simula la llegada de un mensaje nuevo de un cliente cualquiera.
// Útil para demos sin conectar WhatsApp real.
const SAMPLE_MESSAGES = [
  { text: "Hola! quiero ordenar 2 pizzas margarita y una hawaiana para entrega ya", phone: "5215512345001", name: "Carlos Méndez" },
  { text: "Buenas! quería reservar para 6 personas el sábado a las 9pm", phone: "5215512345002", name: "Laura Pérez" },
  { text: "Oigan la pizza llegó toda fría y tardaron 1 hora, qué mal servicio", phone: "5215512345003", name: "Diego Ramírez" },
  { text: "Cuánto cuesta su lasaña? la quiero para llevar", phone: "5215512345004", name: "Sofía Hernández" },
  { text: "Excelente todo, súper rica la comida! 10/10", phone: "5215512345005", name: "Andrés Castro" },
  { text: "Me mandan el menú por favor?", phone: "5215512345006", name: "Patricia Luna" },
  { text: "Urgente! necesito cancelar mi pedido de las 8pm", phone: "5215512345007", name: "Mario Vega" },
  { text: "Tienen opciones vegetarianas para 4 personas?", phone: "5215512345008", name: "Camila Ortiz" },
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tenantId = DEMO_TENANT_ID;

  const sample = body.text
    ? { text: body.text, phone: body.phone ?? "5215599999999", name: body.name ?? "Cliente demo" }
    : SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];

  const channelType = body.channel ?? "whatsapp";

  let channel = await prisma.channel.findFirst({
    where: { tenantId, type: channelType },
  });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        tenantId,
        type: channelType,
        identifier: channelType === "whatsapp" ? "+52 55 0000 0000" : "@latrattoria",
        status: "connected",
      },
    });
  }

  const contact = await prisma.contact.upsert({
    where: { id: `${tenantId}-${sample.phone}` },
    update: { name: sample.name },
    create: {
      id: `${tenantId}-${sample.phone}`,
      tenantId,
      name: sample.name,
      phone: sample.phone,
    },
  });

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

  const analysis = await analyzeMessage(sample.text);

  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "in",
      type: "text",
      content: sample.text,
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

  return NextResponse.json({ message: msg, conversationId: conversation.id, analysis });
}
