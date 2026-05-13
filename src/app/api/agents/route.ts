import { NextRequest, NextResponse } from "next/server";
import { DEMO_TENANT_ID, prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const agents = await prisma.agent.findMany({
    where: { tenantId: DEMO_TENANT_ID },
    include: {
      _count: { select: { conversations: { where: { status: { in: ["open", "pending"] } } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ agents });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const agent = await prisma.agent.create({
    data: {
      tenantId: DEMO_TENANT_ID,
      name: body.name,
      email: body.email ?? null,
      specialty: body.specialty ?? null,
      role: body.role ?? "agent",
      status: "online",
    },
  });
  return NextResponse.json({ agent });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const agent = await prisma.agent.update({
    where: { id: body.id },
    data: {
      name: body.name,
      status: body.status,
      specialty: body.specialty,
    },
  });
  return NextResponse.json({ agent });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.agent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
