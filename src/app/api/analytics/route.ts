import { NextResponse } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = DEMO_TENANT_ID;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const [totalToday, totalWeek, opportunities, byIntent, bySentiment, byChannel, recentMissed, agentsStats] =
    await Promise.all([
      prisma.conversation.count({
        where: { tenantId, lastMessageAt: { gte: startOfDay } },
      }),
      prisma.conversation.count({
        where: { tenantId, lastMessageAt: { gte: startOfWeek } },
      }),
      prisma.conversation.findMany({
        where: { tenantId, isOpportunity: true },
        select: { id: true, opportunityValue: true, status: true, agentId: true },
      }),
      prisma.conversation.groupBy({
        by: ["intent"],
        where: { tenantId, intent: { not: null } },
        _count: true,
      }),
      prisma.conversation.groupBy({
        by: ["sentiment"],
        where: { tenantId, sentiment: { not: null } },
        _count: true,
      }),
      prisma.channel.findMany({
        where: { tenantId },
        include: { _count: { select: { conversations: true } } },
      }),
      prisma.conversation.findMany({
        where: {
          tenantId,
          isOpportunity: true,
          status: { not: "closed" },
          agentId: null,
        },
        include: { contact: true, channel: true },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      }),
      prisma.agent.findMany({
        where: { tenantId },
        orderBy: { conversationsHandled: "desc" },
      }),
    ]);

  const totalOpportunityValue = opportunities.reduce(
    (sum, o) => sum + (o.opportunityValue ?? 0),
    0
  );
  const missedValue = opportunities
    .filter((o) => !o.agentId)
    .reduce((sum, o) => sum + (o.opportunityValue ?? 0), 0);

  // Conversaciones por día (últimos 7 días)
  const last7Days = await prisma.conversation.findMany({
    where: { tenantId, lastMessageAt: { gte: startOfWeek } },
    select: { lastMessageAt: true, sentiment: true, isOpportunity: true, opportunityValue: true },
  });

  const dayBuckets: Record<string, { date: string; total: number; oportunidades: number; valor: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = { date: key, total: 0, oportunidades: 0, valor: 0 };
  }
  for (const c of last7Days) {
    const key = c.lastMessageAt.toISOString().slice(0, 10);
    if (!dayBuckets[key]) continue;
    dayBuckets[key].total += 1;
    if (c.isOpportunity) {
      dayBuckets[key].oportunidades += 1;
      dayBuckets[key].valor += c.opportunityValue ?? 0;
    }
  }

  return NextResponse.json({
    kpis: {
      totalToday,
      totalWeek,
      opportunitiesCount: opportunities.length,
      totalOpportunityValue,
      missedValue,
      avgResponseSec: agentsStats.length
        ? Math.round(
            agentsStats.reduce((s, a) => s + a.avgResponseSec, 0) / agentsStats.length
          )
        : 0,
    },
    byIntent,
    bySentiment,
    byChannel: byChannel.map((c) => ({
      type: c.type,
      count: c._count.conversations,
      status: c.status,
    })),
    series: Object.values(dayBuckets),
    recentMissed,
    agents: agentsStats,
  });
}
