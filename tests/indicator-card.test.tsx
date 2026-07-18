import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IndicatorCard } from "@/components/indicators/indicator-card";
import { getMockDashboardData } from "@/lib/dashboard-data";

vi.mock("@/components/charts/indicator-chart", () => ({ IndicatorChart: () => <div data-testid="chart" /> }));

describe("IndicatorCard", () => {
  it("labels mock data and shows its source", () => {
    render(<IndicatorCard indicator={getMockDashboardData().indicators[0]} />);
    expect(screen.getByText("예시 데이터")).toBeInTheDocument();
    expect(screen.getByText(/출처: 행정동 단위 서울 생활인구/)).toBeInTheDocument();
  });
  it("shows insufficient source instead of zero", () => {
    render(<IndicatorCard indicator={getMockDashboardData().indicators[1]} />);
    expect(screen.getAllByText("자료 없음").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
  it("shows collection date and update cycle separately from the base date", () => {
    render(<IndicatorCard indicator={getMockDashboardData().indicators[0]} />);
    expect(screen.getByText(/수집 2026\. 6\. 30\./)).toBeInTheDocument();
    expect(screen.getByText(/매일/)).toBeInTheDocument();
  });
});
