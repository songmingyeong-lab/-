import { describe, expect, it } from "vitest";
import {
  calculateCategoryScore,
  calculateComparisonRate,
  calculateDataCoverage,
  calculateIndicatorScore,
  calculateMean,
  calculateMedian,
  normalizePer10000,
  scoreBalanced,
  scoreHigherIsBetter,
  scoreLowerIsBetter,
} from "@/lib/scoring/calculations";
import type { IndicatorScoreResult } from "@/lib/scoring/types";

function result(score: number | null, weight: number, scope: IndicatorScoreResult["comparisonScope"] = "GURO_DONG"): IndicatorScoreResult {
  return {
    indicatorCode: crypto.randomUUID(), indicatorName: "지표", category: "상권 변화", comparisonScope: scope,
    targetGeographicUnit: scope === "SEOUL_DISTRICT" ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    comparisonGeographicUnit: scope === "SEOUL_DISTRICT" ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    targetAreaName: scope === "SEOUL_DISTRICT" ? "구로구" : "가리봉동", comparisonAreaDescription: "비교범위",
    score, scoreStatus: score === null ? "NOT_CALCULABLE" : "CALCULATED", scoreReason: score === null ? "자료 없음" : null,
    direction: "HIGHER_IS_BETTER", targetValue: 110, comparisonValue: 100, comparisonMean: 100, comparisonMedian: 100,
    comparisonMethod: "MEAN", comparisonRate: 10, difference: 10, comparisonCount: 10, minimumComparisonCount: 5,
    unit: "건", baseDate: "2026-06", basePeriod: "2026-06", weight, interpretation: "해석", dataSource: "공식 API", calculatedAt: "2026-07-19T00:00:00Z",
  };
}

describe("v2 공간 비교 계산", () => {
  it("null을 0으로 바꾸지 않고 평균과 중앙값에서 제외한다", () => {
    expect(calculateMean([10, null, 20])).toBe(15);
    expect(calculateMedian([30, null, 10, 20])).toBe(20);
    expect(calculateMean([null])).toBeNull();
  });

  it("비교평균과 비교중앙값을 계산한다", () => {
    expect(calculateMean([2, 4, 9])).toBe(5);
    expect(calculateMedian([2, 4, 9, 10])).toBe(6.5);
  });

  it("비교값이 0 또는 null이면 비교율을 산출하지 않는다", () => {
    expect(calculateComparisonRate(10, 0)).toBeNull();
    expect(calculateComparisonRate(null, 10)).toBeNull();
    expect(calculateComparisonRate(120, 100)).toBe(20);
  });

  it("민원율과 프로그램 수를 인구 1만 명당 값으로 환산한다", () => {
    expect(normalizePer10000(120, 100_000, "2026-06", "2026-06")).toBeCloseTo(12);
    expect(normalizePer10000(40, 200_000, "2026-06", "2026-06")).toBe(2);
  });

  it("분자와 주민등록인구 기준월이 다르면 정규화를 차단한다", () => {
    expect(normalizePer10000(120, 100_000, "2026-06", "2026-05")).toBeNull();
  });

  it("HIGHER_IS_BETTER 경계값을 점수화한다", () => {
    expect(scoreHigherIsBetter(20)).toBe(5);
    expect(scoreHigherIsBetter(5)).toBe(4);
    expect(scoreHigherIsBetter(-4.99)).toBe(3);
    expect(scoreHigherIsBetter(-5)).toBe(2);
    expect(scoreHigherIsBetter(-20)).toBe(1);
  });

  it("LOWER_IS_BETTER 경계값을 점수화한다", () => {
    expect(scoreLowerIsBetter(-20)).toBe(5);
    expect(scoreLowerIsBetter(-5)).toBe(4);
    expect(scoreLowerIsBetter(4.99)).toBe(3);
    expect(scoreLowerIsBetter(5)).toBe(2);
    expect(scoreLowerIsBetter(20)).toBe(1);
  });

  it("BALANCED는 평균에서 벗어난 절대 편차를 점수화한다", () => {
    expect(scoreBalanced(4.99)).toBe(5);
    expect(scoreBalanced(-5)).toBe(4);
    expect(scoreBalanced(10)).toBe(3);
    expect(scoreBalanced(-20)).toBe(2);
    expect(scoreBalanced(35)).toBe(1);
  });

  it("INFORMATION_ONLY는 지표점수를 반환하지 않는다", () => {
    expect(calculateIndicatorScore(30, "INFORMATION_ONLY")).toBeNull();
  });

  it("행정동과 자치구 점수를 같은 영역 가중평균에 반영한다", () => {
    expect(calculateCategoryScore([result(5, 0.4, "GURO_DONG"), result(3, 0.6, "SEOUL_DISTRICT")])).toMatchObject({ score: 3.8, scoreStatus: "CALCULATED", dataCoverage: 100 });
  });

  it("계산 가능한 가중치로 dataCoverage를 산출하고 50% 미만은 보류한다", () => {
    const scores = [result(5, 0.49), result(null, 0.51)];
    expect(calculateDataCoverage(scores)).toBe(49);
    expect(calculateCategoryScore(scores)).toMatchObject({ score: null, scoreStatus: "NOT_CALCULABLE", dataCoverage: 49 });
  });
});
