import "server-only";
import { getPrismaClient } from "@/lib/db/client";
import { calculateComparisonRate, calculateIndicatorScore, calculateMean } from "@/lib/scoring/calculations";

export const VACANCY_SOURCE_NOTE = "빈집 현황은 지자체 행정조사 자료로 조사 시점과 조사 품질에 차이가 있을 수 있으며, 주민 만족도나 도시재생사업 효과를 직접 측정한 값이 아닙니다.";

type VacancyComparison = {
  candidates?: Array<{ value?: number | null }>;
};

export function summarizeVacancyComparison(value: number | null, metadata: unknown) {
  const spatialComparison = (metadata as { spatialComparison?: VacancyComparison } | null)?.spatialComparison;
  const values = spatialComparison?.candidates?.map((candidate) =>
    typeof candidate.value === "number" ? candidate.value : null,
  ) ?? [];
  const comparisonValue = calculateMean(values);
  const comparisonRate = calculateComparisonRate(value, comparisonValue);
  return {
    comparisonValue,
    comparisonRate,
    comparisonCount: values.filter((candidate) => candidate !== null).length,
    score: comparisonRate === null ? null : calculateIndicatorScore(comparisonRate, "LOWER_IS_BETTER"),
  };
}

export function formatKoreanDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function latestVacancy(adminDongCode: string, baseDate?: string | null) {
  const prisma = getPrismaClient();
  return prisma.vacancyAreaIndicator.findFirst({
    where: {
      adminDongCode,
      ...(baseDate ? { baseDate: new Date(`${baseDate}T00:00:00+09:00`) } : {}),
    },
    include: { area: true },
    orderBy: [{ baseDate: "desc" }, { collectedAt: "desc" }],
  });
}

export async function vacancyTrend(adminDongCode: string) {
  const prisma = getPrismaClient();
  return prisma.vacancyAreaIndicator.findMany({
    where: { adminDongCode, indicatorCode: "vacant_house_count" },
    select: { baseDate: true, value: true, unit: true, collectedAt: true },
    orderBy: { baseDate: "asc" },
  });
}

export async function vacancyAreas() {
  const prisma = getPrismaClient();
  return prisma.area.findMany({
    where: { active: true, administrativeDongCode: { not: null } },
    select: {
      slug: true,
      cityName: true,
      districtName: true,
      administrativeDongName: true,
      administrativeDongCode: true,
      legalDongName: true,
      legalDongCode: true,
    },
    orderBy: { slug: "asc" },
  });
}
