import { NextResponse } from "next/server";
import { formatKoreanDate, latestVacancy, summarizeVacancyComparison, VACANCY_SOURCE_NOTE } from "@/lib/vacancy-summary";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminDongCode = url.searchParams.get("adminDongCode");
  if (!adminDongCode) return NextResponse.json({ error: "adminDongCode가 필요합니다." }, { status: 400 });
  const row = await latestVacancy(adminDongCode, url.searchParams.get("baseDate"));
  if (!row) return NextResponse.json({ error: "수집된 빈집 자료가 없습니다." }, { status: 404 });
  const comparison = summarizeVacancyComparison(row.value?.toNumber() ?? null, row.metadataJson);
  return NextResponse.json({
    area: {
      sidoName: row.area?.cityName ?? "서울특별시",
      districtName: row.area?.districtName ?? "",
      adminDongName: row.adminDongName,
      adminDongCode: row.adminDongCode,
    },
    period: {
      baseDate: formatKoreanDate(row.baseDate),
      periodPrecision: "YEAR_ONLY",
      dataUpdatedAt: row.sourceUpdatedAt?.toISOString() ?? null,
    },
    cards: [{
      indicatorCode: row.indicatorCode,
      label: row.indicatorName,
      value: row.value?.toNumber() ?? null,
      unit: row.unit,
    }],
    domainScore: {
      domain: "주거환경",
      score: comparison.score,
      usedIndicators: row.value === null ? 0 : 1,
      plannedIndicators: 5,
      dataCompleteness: row.value === null ? 0 : 20,
    },
    trends: [],
    comparisons: [{
      scope: "동일 자치구 다른 법정동 평균",
      value: comparison.comparisonValue,
      comparisonRate: comparison.comparisonRate,
      comparisonCount: comparison.comparisonCount,
      direction: "LOWER_IS_BETTER",
      score: comparison.score,
    }],
    comparisonAvailability: {
      previousPeriod: false,
      districtAverage: comparison.comparisonValue !== null,
      seoulAverage: false,
    },
    source: {
      name: row.source,
      url: row.sourceUrl,
      collectionMethod: row.sourceMethod,
      updatedAt: row.sourceUpdatedAt?.toISOString() ?? null,
      collectedAt: row.collectedAt.toISOString(),
    },
    dataQualityNote: `${row.dataQualityNote} ${VACANCY_SOURCE_NOTE}`,
  });
}
