import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getMockDashboardData } from "@/lib/dashboard-data";
import { INDICATOR_AREA_ORDER } from "@/lib/indicators/types";

vi.mock("@/components/charts/indicator-chart", () => ({ IndicatorChart: () => <div data-testid="chart" /> }));

describe("Dashboard areas", () => {
  it("renders the five fixed areas in the required order", () => {
    const { container } = render(<Dashboard data={getMockDashboardData()} />);
    const headings = [...container.querySelectorAll(".area-heading h3")].map((heading) => heading.textContent);
    expect(headings).toEqual([...INDICATOR_AREA_ORDER]);
  });

  it("does not display the project start and end years", () => {
    render(<Dashboard data={getMockDashboardData()} />);
    expect(screen.queryByText(/2015~2020/)).not.toBeInTheDocument();
  });

  it("renders category score summaries without creating an overall score", () => {
    render(<Dashboard data={getMockDashboardData()} />);
    expect(screen.getAllByText("영역 진단점수")).toHaveLength(5);
    expect(screen.getAllByText("산출 보류").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText("전체 종합점수")).not.toBeInTheDocument();
  });
});
