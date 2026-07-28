import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommercialComparisonCard } from "@/components/dashboard/commercial-comparison-card";
import { getMockDashboardData } from "@/lib/dashboard-data";
import type { ComparisonAvailability } from "@/lib/scoring/types";

const base: ComparisonAvailability = {
  available: true,
  districtName: "구로구",
  collectedDongCount: 16,
  usableDongCount: 15,
  minimumRequired: 5,
  quality: "normal",
  scopeLabel: "수집된 행정동 기준",
  basePeriod: "20261",
  comparisonMean: 1_500,
  comparisonMedian: 1_100,
  percentileRank: 35,
  referenceScore: 2,
  previousQuarterChangeRate: -1.8,
  yearOverYearChangeRate: null,
  recentFourQuarterAverage: null,
  recentFourQuarterChangeRate: null,
  fallbackMode: "district_comparison",
  message: "같은 자치구 내 비교 가능한 행정동을 기준으로 산정한 상대점수입니다.",
};

const store = getMockDashboardData().indicators.find((indicator) => indicator.code === "store_count")!;

describe("CommercialComparisonCard", () => {
  it("shows normal comparison statistics and trend availability", () => {
    render(<CommercialComparisonCard availability={base} storeIndicator={store} />);
    expect(screen.getByText("정상 비교")).toBeInTheDocument();
    expect(screen.getByText("같은 자치구 내 비교 가능한 행정동을 기준으로 산정한 상대점수입니다.")).toBeInTheDocument();
    expect(screen.getByText("15개")).toBeInTheDocument();
    expect(screen.getAllByText("비교 자료 미수집")).toHaveLength(2);
  });

  it("marks five to nine dongs as limited comparison", () => {
    render(<CommercialComparisonCard availability={{ ...base, quality: "low", usableDongCount: 7, message: "현재 수집된 일부 행정동만을 기준으로 계산한 제한적 비교값입니다." }} storeIndicator={store} />);
    expect(screen.getByText("제한적 비교")).toBeInTheDocument();
    expect(screen.getByText("비교 행정동 수가 적어 참고용으로만 해석")).toBeInTheDocument();
    expect(screen.getByText("현재 수집된 일부 행정동만을 기준으로 계산한 제한적 비교값입니다.")).toBeInTheDocument();
  });

  it("withholds the score below five comparison dongs", () => {
    render(<CommercialComparisonCard availability={{ ...base, available: false, quality: "insufficient", usableDongCount: 4, referenceScore: null }} storeIndicator={store} />);
    expect(screen.getByText("비교 불가")).toBeInTheDocument();
    expect(screen.getByText("같은 자치구 내 비교 가능한 행정동 데이터가 부족해 상대점수를 산정하지 않았습니다.")).toBeInTheDocument();
  });
});
