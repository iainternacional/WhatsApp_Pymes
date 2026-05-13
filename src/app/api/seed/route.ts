import { NextResponse } from "next/server";
import { seedDemo } from "@/lib/seed";

export const runtime = "nodejs";

export async function POST() {
  const result = await seedDemo();
  return NextResponse.json(result);
}

export async function GET() {
  const result = await seedDemo();
  return NextResponse.json(result);
}
