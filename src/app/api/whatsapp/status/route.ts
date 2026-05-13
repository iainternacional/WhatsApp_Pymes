import { NextResponse } from "next/server";
import { getClientState } from "@/lib/whatsapp/baileys-client";
import { DEMO_TENANT_ID } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = getClientState(DEMO_TENANT_ID);
  return NextResponse.json({
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    phone: state.phone,
    lastError: state.lastError,
  });
}
