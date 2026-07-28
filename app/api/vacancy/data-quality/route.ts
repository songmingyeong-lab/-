import { NextResponse } from "next/server";
import { latestVacancy, VACANCY_SOURCE_NOTE } from "@/lib/vacancy-summary";

export async function GET(request: Request) {
  const adminDongCode = new URL(request.url).searchParams.get("adminDongCode");
  if (!adminDongCode) return NextResponse.json({ error: "adminDongCode가 필요합니다." }, { status: 400 });
  const row = await latestVacancy(adminDongCode);
  return NextResponse.json({
    available: Boolean(row),
    geographicPrecision: row ? "LEGAL_DONG_PROXY" : null,
    periodPrecision: row ? "YEAR_ONLY" : null,
    note: row ? `${row.dataQualityNote} ${VACANCY_SOURCE_NOTE}` : "수집된 빈집 자료가 없습니다.",
  });
}
