import type { DashboardIndicator } from "@/lib/indicators/types";
import { calculateMean, calculateMedian } from "@/lib/scoring/calculations";
import type { ComparableAreaValue, ComparisonAvailability } from "@/lib/scoring/types";

const MINIMUM_COMPARISON_COUNT = 5 as const;

function changeRate(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function validValue(item: ComparableAreaValue) {
  return item.value !== null && Number.isFinite(item.value);
}

function yearQuarter(label: string) {
  const match = label.match(/(\d{4})년\s*(\d)분기/);
  return match ? { year: Number(match[1]), quarter: Number(match[2]) } : null;
}

function trendChanges(indicator?: DashboardIndicator) {
  const valid = indicator?.series.filter((point) => point.value !== null && Number.isFinite(point.value)) ?? [];
  const current = valid.at(-1) ?? null;
  const previous = valid.at(-2) ?? null;
  const currentPeriod = current ? yearQuarter(current.date) : null;
  const yearAgo = currentPeriod
    ? valid.find((point) => {
      const period = yearQuarter(point.date);
      return period?.year === currentPeriod.year - 1 && period.quarter === currentPeriod.quarter;
    }) ?? null
    : null;
  const recentFour = valid.slice(-4).map((point) => point.value).filter((value): value is number => value !== null);
  const recentFourQuarterAverage = recentFour.length === 4 ? calculateMean(recentFour) : null;
  return {
    previousQuarterChangeRate: changeRate(current?.value ?? indicator?.value ?? null, previous?.value ?? indicator?.previousValue ?? null),
    yearOverYearChangeRate: changeRate(current?.value ?? indicator?.value ?? null, yearAgo?.value ?? null),
    recentFourQuarterAverage,
    recentFourQuarterChangeRate: changeRate(current?.value ?? indicator?.value ?? null, recentFourQuarterAverage),
  };
}

export function evaluateDistrictComparison(
  indicator: DashboardIndicator | undefined,
  districtName: string,
  targetDistrictCode: string | null,
): ComparisonAvailability {
  const trend = trendChanges(indicator);
  const spatial = indicator?.spatialComparison;
  const target = spatial?.target;
  const compositeTarget = target?.areaCode.includes("COMPOSITE") ?? false;
  const candidates = target && targetDistrictCode && !compositeTarget
    ? spatial.candidates.filter((candidate) =>
      candidate.areaCode !== target.areaCode
      && candidate.districtCode === targetDistrictCode
      && candidate.geographicUnit === "ADMINISTRATIVE_DONG"
      && candidate.basePeriod === target.basePeriod
      && candidate.unit === target.unit
    )
    : [];
  const collected = new Map(candidates.map((candidate) => [candidate.areaCode, candidate]));
  const usable = [...collected.values()].filter(validValue);
  const targetUsable = Boolean(
    target
    && !compositeTarget
    && target.districtCode === targetDistrictCode
    && target.geographicUnit === "ADMINISTRATIVE_DONG"
    && validValue(target),
  );
  const usableDongCount = targetUsable ? usable.length : 0;
  const collectedDongCount = targetUsable ? collected.size + 1 : 0;
  const quality = usableDongCount >= 10 ? "normal" : usableDongCount >= MINIMUM_COMPARISON_COUNT ? "low" : "insufficient";
  const available = quality !== "insufficient";
  const comparisonValues = usable.map((candidate) => candidate.value).filter((value): value is number => value !== null);
  const targetValue = targetUsable && target?.value !== null && target?.value !== undefined ? target.value : null;
  const allValues = targetValue !== null ? [targetValue, ...comparisonValues] : [];
  const percentileRank = targetValue !== null && allValues.length > 0
    ? ((allValues.filter((value) => value < targetValue).length
      + allValues.filter((value) => value === targetValue).length * 0.5) / allValues.length) * 100
    : null;
  const referenceScore = available && percentileRank !== null
    ? Math.min(5, Math.max(1, Math.ceil(percentileRank / 20)))
    : null;
  const message = quality === "normal"
    ? "같은 자치구 내 비교 가능한 행정동을 기준으로 산정한 상대점수입니다."
    : quality === "low"
      ? "현재 수집된 일부 행정동만을 기준으로 계산한 제한적 비교값입니다."
      : "같은 자치구의 비교 데이터가 부족해 점수를 산정하지 않았습니다.";
  const fallbackMode = available
    ? "district_comparison"
    : trend.yearOverYearChangeRate !== null
      ? "year_over_year"
      : trend.recentFourQuarterAverage !== null
        ? "recent_four_quarter_average"
        : "raw_only";
  return {
    available,
    districtName,
    collectedDongCount,
    usableDongCount,
    minimumRequired: MINIMUM_COMPARISON_COUNT,
    quality,
    scopeLabel: "수집된 행정동 기준",
    basePeriod: targetUsable ? target?.basePeriod ?? null : null,
    comparisonMean: targetUsable ? calculateMean(comparisonValues) : null,
    comparisonMedian: targetUsable ? calculateMedian(comparisonValues) : null,
    percentileRank,
    referenceScore,
    ...trend,
    fallbackMode,
    message,
  };
}
