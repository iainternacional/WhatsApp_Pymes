import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/openai-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) {
    return NextResponse.json({ error: "audio requerido" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await transcribeAudio(buffer, file.name);
  return NextResponse.json({ text });
}
