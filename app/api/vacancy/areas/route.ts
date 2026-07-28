import { NextResponse } from "next/server";
import { vacancyAreas } from "@/lib/vacancy-summary";

export async function GET() {
  return NextResponse.json({ data: await vacancyAreas() });
}
