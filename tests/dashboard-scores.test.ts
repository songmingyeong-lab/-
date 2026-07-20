import { describe, expect, it } from "vitest";
import { getMockDashboardData } from "@/lib/dashboard-data";
import type { DashboardIndicator } from "@/lib/indicators/types";
import { calculateDashboardScores } from "@/lib/scoring/dashboard-scores";
import type { ComparableAreaValue } from "@/lib/scoring/types";

const codes = { targetDongCode: "1153059500", targetDistrictCode: "11530" };

function value(areaCode: string, amount: number | null): ComparableAreaValue {
  return { areaCode, areaName: areaCode === codes.targetDongCode ? "가리봉동" : `비교동-${areaCode}`, cityCode: "11", districtCode: codes.targetDistrictCode, geographicUnit: "ADMINISTRATIVE_DONG", basePeriod: "2026Q1", unit: "개", value: amount };
}

function storeIndicator(comparisonCount: number): DashboardIndicator {
  const source = getMockDashboardData().indicators.find((indicator) => indicator.code === "store_count")!;
  return {
    ...source,
    value: 120,
    unit: "개",
    baseDate: "2026Q1",
    spatialComparison: {
      target: value(codes.targetDongCode, 120),
      candidates: Array.from({ length: comparisonCount }, (_, index) => value(`11530${String(index + 1).padStart(5, "0")}`, 100)),
    },
  };
}

describe("대시보드 공간비교 점수 조정", () => {
  it("값이 없는 빈집은 대체점수로 만들지 않고 민원만 명시적 임시점수를 적용한다", () => {
    const data = getMockDashboardData();
    const categories = calculateDashboardScores(data.indicators, codes);
    expect(categories).toHaveLength(5);
    const scores = categories.flatMap((category) => category.indicatorScores);
    expect(scores.find((score) => score.indicatorCode === "vacant_house_count")?.score).toBeNull();
    expect(scores.find((score) => score.indicatorCode === "noise_vibration_complaint_count")).toMatchObject({ score: 3, scoreStatus: "CALCULATED" });
  });

  it("GURO_DONG 비교군이 최소 5개면 지표점수를 계산한다", () => {
    const categories = calculateDashboardScores([storeIndicator(5)], codes, "2026-07-19T00:00:00Z");
    const score = categories.find((category) => category.category === "상권 변화")!.indicatorScores.find((item) => item.indicatorCode === "store_count")!;
    expect(score).toMatchObject({ score: 2, scoreStatus: "CALCULATED", comparisonCount: 5, comparisonMean: 100, comparisonRate: 20 });
  });

  it("GURO_DONG 비교군이 5개 미만이면 점수를 보류한다", () => {
    const categories = calculateDashboardScores([storeIndicator(4)], codes);
    const score = categories.find((category) => category.category === "상권 변화")!.indicatorScores.find((item) => item.indicatorCode === "store_count")!;
    expect(score).toMatchObject({ score: null, scoreStatus: "NOT_CALCULABLE", comparisonCount: 4 });
    expect(score.scoreReason).toContain("최소 5개");
  });

  it("SEOUL_DISTRICT 기본 최소 표본은 10개로 설정한다", () => {
    const noise = calculateDashboardScores(getMockDashboardData().indicators, codes)
      .find((category) => category.category === "생활 불편")!.indicatorScores
      .find((item) => item.indicatorCode === "noise_vibration_complaint_count")!;
    expect(noise).toMatchObject({ score: 3, scoreStatus: "CALCULATED", minimumComparisonCount: 10, targetAreaName: "구로구" });
  });

  it("비교군이 없는 민원은 임시 중립점수임을 명시하고 다른 지표는 수집 전 보류한다", () => {
    const scores = calculateDashboardScores(getMockDashboardData().indicators, codes).flatMap((category) => category.indicatorScores);
    expect(scores.find((score) => score.indicatorCode === "noise_vibration_complaint_count")?.scoreReason).toContain("임시 3점");
    expect(scores.find((score) => score.indicatorCode === "resident_program_count")?.scoreStatus).toBe("NOT_CALCULABLE");
    expect(scores.find((score) => score.indicatorCode === "urban_regeneration_hub_count")?.scoreStatus).toBe("NOT_CALCULABLE");
  });
});
