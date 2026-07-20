import { describe, expect, it } from "vitest";
import {
  buildGuroDongComparisonGroup,
  buildSeoulDistrictComparisonGroup,
  formatComparisonScope,
  validateComparableObservations,
} from "@/lib/scoring/comparison-groups";
import type { ComparableAreaValue } from "@/lib/scoring/types";

const targetDongCode = "1153059500";
const guroCode = "11530";

function dong(areaCode: string, overrides: Partial<ComparableAreaValue> = {}): ComparableAreaValue {
  return { areaCode, areaName: areaCode === targetDongCode ? "가리봉동" : `동-${areaCode}`, cityCode: "11", districtCode: guroCode, geographicUnit: "ADMINISTRATIVE_DONG", basePeriod: "2026Q1", unit: "개", value: 10, ...overrides };
}

function district(areaCode: string, overrides: Partial<ComparableAreaValue> = {}): ComparableAreaValue {
  return { areaCode, areaName: areaCode === guroCode ? "구로구" : `구-${areaCode}`, cityCode: "11", districtCode: areaCode, geographicUnit: "DISTRICT", basePeriod: "2026", unit: "건/1만명", value: 10, ...overrides };
}

describe("공간 비교집단", () => {
  it("GURO_DONG에서 가리봉동과 구로구 밖 행정동을 제외한다", () => {
    const group = buildGuroDongComparisonGroup([dong(targetDongCode), dong("1153010100"), dong("1168010100", { districtCode: "11680" })], targetDongCode, guroCode);
    expect(group.target.areaCode).toBe(targetDongCode);
    expect(group.comparisons.map((value) => value.areaCode)).toEqual(["1153010100"]);
  });

  it("SEOUL_DISTRICT에서 구로구와 서울 밖 자치구를 제외한다", () => {
    const group = buildSeoulDistrictComparisonGroup([district(guroCode), district("11110"), district("26110", { cityCode: "26" })], guroCode);
    expect(group.target.areaCode).toBe(guroCode);
    expect(group.comparisons.map((value) => value.areaCode)).toEqual(["11110"]);
  });

  it("행정동·자치구 혼합, 다른 기준기간과 다른 단위를 차단한다", () => {
    const target = dong(targetDongCode);
    const valid = validateComparableObservations(target, [
      dong("1153010100"),
      district("11110", { basePeriod: "2026Q1", unit: "개" }),
      dong("1153010200", { basePeriod: "2025Q4" }),
      dong("1153010300", { unit: "%" }),
    ]);
    expect(valid.map((value) => value.areaCode)).toEqual(["1153010100"]);
  });

  it("결측값을 비교군의 0으로 포함하지 않는다", () => {
    const group = buildGuroDongComparisonGroup([dong(targetDongCode), dong("1153010100", { value: null }), dong("1153010200", { value: 0 })], targetDongCode, guroCode);
    expect(group.comparisons).toHaveLength(1);
    expect(group.comparisons[0].value).toBe(0);
  });

  it("비교범위 라벨을 구체적으로 만든다", () => {
    expect(formatComparisonScope("GURO_DONG")).toContain("가리봉동");
    expect(formatComparisonScope("SEOUL_DISTRICT")).toContain("서울시");
  });
});
