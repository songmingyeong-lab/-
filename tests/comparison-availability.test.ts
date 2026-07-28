import { describe, expect, it } from "vitest";
import { getMockDashboardData } from "@/lib/dashboard-data";
import type { DashboardIndicator } from "@/lib/indicators/types";
import { evaluateDistrictComparison } from "@/lib/scoring/comparison-availability";

function indicatorWithComparisons(count: number): DashboardIndicator {
  const source = getMockDashboardData().indicators.find((indicator) => indicator.code === "store_count")!;
  return {
    ...source,
    value: 120,
    series: [
      { date: "2025년 3분기", value: 100 },
      { date: "2025년 4분기", value: 110 },
      { date: "2026년 1분기", value: 120 },
    ],
    spatialComparison: {
      target: { areaCode: "11530595", areaName: "가리봉동", cityCode: "11", districtCode: "11530", geographicUnit: "ADMINISTRATIVE_DONG", basePeriod: "20261", unit: "개", value: 120 },
      candidates: Array.from({ length: count }, (_, index) => ({
        areaCode: `1153${String(index).padStart(4, "0")}`,
        areaName: `비교동${index + 1}`,
        cityCode: "11",
        districtCode: "11530",
        geographicUnit: "ADMINISTRATIVE_DONG" as const,
        basePeriod: "20261",
        unit: "개",
        value: 100 + index,
      })),
    },
  };
}

describe("district comparison availability", () => {
  it("treats ten or more usable comparison dongs as normal", () => {
    const result = evaluateDistrictComparison(indicatorWithComparisons(15), "구로구", "11530");
    expect(result).toMatchObject({
      available: true,
      collectedDongCount: 16,
      usableDongCount: 15,
      quality: "normal",
      basePeriod: "20261",
      yearOverYearChangeRate: null,
    });
    expect(result.previousQuarterChangeRate).toBeCloseTo(120 / 110 * 100 - 100);
  });

  it("marks five to nine dongs as low quality", () => {
    expect(evaluateDistrictComparison(indicatorWithComparisons(5), "구로구", "11530")).toMatchObject({
      available: true,
      quality: "low",
      usableDongCount: 5,
      scopeLabel: "수집된 행정동 기준",
    });
  });

  it("does not score fewer than five dongs or a composite target", () => {
    expect(evaluateDistrictComparison(indicatorWithComparisons(4), "구로구", "11530")).toMatchObject({
      available: false,
      quality: "insufficient",
      referenceScore: null,
    });
    const composite = indicatorWithComparisons(15);
    composite.spatialComparison!.target.areaCode = "11110-COMPOSITE";
    expect(evaluateDistrictComparison(composite, "종로구", "11110")).toMatchObject({
      available: false,
      usableDongCount: 0,
      quality: "insufficient",
    });
  });
});
