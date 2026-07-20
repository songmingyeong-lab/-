import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndicatorCard } from "@/components/indicators/indicator-card";
import { getMockDashboardData } from "@/lib/dashboard-data";
import { calculateDashboardScores } from "@/lib/scoring/dashboard-scores";

vi.mock("@/components/charts/indicator-chart", () => ({ IndicatorChart: () => <div data-testid="chart" /> }));

describe("IndicatorCard", () => {
  it("labels the verified snapshot and shows its source", () => {
    const indicator = getMockDashboardData().indicators.find((item) => item.code === "living_population")!;
    render(<IndicatorCard indicator={indicator} />);
    expect(screen.getByText("공식자료 확인값")).toBeInTheDocument();
    expect(screen.getByText(/출처: 행정동 단위 서울 생활인구/)).toBeInTheDocument();
  });
  it("shows insufficient source instead of zero", () => {
    const indicator = getMockDashboardData().indicators.find((item) => item.code === "vacant_house_count")!;
    render(<IndicatorCard indicator={indicator} />);
    expect(screen.getAllByText("자료 없음").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText(/자료가 없는 원인:/)).toBeInTheDocument();
    expect(screen.getByText(/가리봉동 자료가 없습니다/)).toBeInTheDocument();
  });
  it("always gives a fallback reason when a missing indicator has no message", () => {
    const indicator = {
      ...getMockDashboardData().indicators.find((item) => item.code === "vacant_house_count")!,
      status: "empty" as const,
      statusMessage: null,
    };
    render(<IndicatorCard indicator={indicator} />);
    expect(screen.getByText(/자료원이 정상 응답했지만/)).toBeInTheDocument();
  });
  it("shows collection date and update cycle separately from the base date", () => {
    const indicator = getMockDashboardData().indicators.find((item) => item.code === "living_population")!;
    render(<IndicatorCard indicator={indicator} />);
    expect(screen.getByText(/수집 2026\. 7\. 18\./)).toBeInTheDocument();
    expect(screen.getByText(/매일/)).toBeInTheDocument();
  });
  it("renders the spatial comparison scope label", () => {
    const indicator = getMockDashboardData().indicators.find((item) => item.code === "store_count")!;
    const score = calculateDashboardScores([indicator], { targetDongCode: "1153059500", targetDistrictCode: "11530" })
      .find((category) => category.category === "상권 변화")!.indicatorScores
      .find((item) => item.indicatorCode === "store_count")!;
    render(<IndicatorCard indicator={indicator} score={score} />);
    expect(screen.getAllByText("가리봉동 대 구로구 다른 행정동").length).toBeGreaterThan(0);
  });
});
