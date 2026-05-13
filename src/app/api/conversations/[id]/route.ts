import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      channel: true,
      agent: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.conversation.update({
    where: { id },
    data: { unread: 0 },
  });
  return NextResponse.json({ conversation });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const conversation = await prisma.conversation.update({
    where: { id },
    data: body,
  });
  return NextResponse.json({ conversation });
}
