import { NextResponse } from "next/server";
import { startClient, disconnectClient } from "@/lib/whatsapp/baileys-client";
import { DEMO_TENANT_ID } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const state = await startClient(DEMO_TENANT_ID);
    return NextResponse.json({
      status: state.status,
      qrDataUrl: state.qrDataUrl,
      phone: state.phone,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await disconnectClient(DEMO_TENANT_ID);
  return NextResponse.json({ status: "disconnected" });
}
