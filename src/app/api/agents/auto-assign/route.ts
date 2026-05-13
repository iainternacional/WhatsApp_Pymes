import { NextRequest, NextResponse } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";

// Asignación inteligente: matchea por especialidad e intent, balancea por carga.
export async function POST(req: NextRequest) {
  const { conversationId } = await req.json();
  if (!conversationId)
    return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });

  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const agents = await prisma.agent.findMany({
    where: { tenantId: DEMO_TENANT_ID, status: { not: "offline" } },
    include: {
      _count: { select: { conversations: { where: { status: { in: ["open", "pending"] } } } } },
    },
  });

  if (!agents.length) {
    return NextResponse.json({ error: "No hay agentes disponibles" }, { status: 404 });
  }

  const intent = conv.intent ?? "consulta";

  const scored = agents.map((a) => {
    let score = 0;
    if (a.specialty && intent.includes(a.specialty)) score += 50;
    if (a.specialty === "quejas" && intent === "queja") score += 80;
    if (a.specialty === "pedidos" && intent === "pedido") score += 80;
    if (a.specialty === "reservas" && intent === "reserva") score += 80;
    score -= a._count.conversations * 5;
    if (a.status === "online") score += 10;
    return { agent: a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { agentId: best.agent.id, status: "open" },
  });

  await prisma.agent.update({
    where: { id: best.agent.id },
    data: { conversationsHandled: { increment: 1 } },
  });

  return NextResponse.json({ conversation: updated, agent: best.agent, score: best.score });
}
