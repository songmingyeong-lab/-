import { NextResponse } from "next/server";
import { formatKoreanDate, vacancyTrend } from "@/lib/vacancy-summary";

export async function GET(request: Request) {
  const adminDongCode = new URL(request.url).searchParams.get("adminDongCode");
  if (!adminDongCode) return NextResponse.json({ error: "adminDongCode가 필요합니다." }, { status: 400 });
  const rows = await vacancyTrend(adminDongCode);
  return NextResponse.json({
    data: rows.map((row) => ({
      baseDate: formatKoreanDate(row.baseDate),
      value: row.value?.toNumber() ?? null,
      unit: row.unit,
      collectedAt: row.collectedAt.toISOString(),
    })),
  });
}
