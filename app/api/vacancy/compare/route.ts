import { NextResponse } from "next/server";
import { latestVacancy, summarizeVacancyComparison } from "@/lib/vacancy-summary";

export async function GET(request: Request) {
  const adminDongCode = new URL(request.url).searchParams.get("adminDongCode");
  if (!adminDongCode) return NextResponse.json({ error: "adminDongCode가 필요합니다." }, { status: 400 });
  const row = await latestVacancy(adminDongCode);
  if (!row) return NextResponse.json({ error: "수집된 빈집 자료가 없습니다." }, { status: 404 });
  const metadata = row.metadataJson as { spatialComparison?: unknown } | null;
  const summary = summarizeVacancyComparison(row.value?.toNumber() ?? null, row.metadataJson);
  return NextResponse.json({
    target: { adminDongCode: row.adminDongCode, adminDongName: row.adminDongName, value: row.value?.toNumber() ?? null, unit: row.unit },
    comparison: metadata?.spatialComparison ?? null,
    summary,
    note: "비교값은 동일 자치구의 법정동 집계이며 행정동 비교가 아닙니다.",
  });
}
