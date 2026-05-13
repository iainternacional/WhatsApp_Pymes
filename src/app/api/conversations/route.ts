import { NextResponse } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");

  const where: any = { tenantId: DEMO_TENANT_ID };
  if (channel && channel !== "all") {
    const channels = await prisma.channel.findMany({
      where: { tenantId: DEMO_TENANT_ID, type: channel },
      select: { id: true },
    });
    where.channelId = { in: channels.map((c) => c.id) };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      contact: true,
      channel: true,
      agent: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ conversations });
}
