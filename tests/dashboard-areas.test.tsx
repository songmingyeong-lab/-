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
    expect(headings).toEqual([...INDICATOR_AREA_ORDER, "참고 지역 경제 수준"]);
    expect(screen.getByText("점수 미반영")).toBeInTheDocument();
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

  it("hides internal household and opening/closing counts and moves economic references", () => {
    render(<Dashboard data={getMockDashboardData()} />);
    expect(screen.queryByRole("heading", { name: "총 가구 수" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "개업 점포 수" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "폐업 점포 수" })).not.toBeInTheDocument();
    expect(screen.getByText("월평균 소득")).toBeInTheDocument();
    expect(screen.getByText("주거 월세 중위값")).toBeInTheDocument();
  });

  it("keeps only the official street floating population indicator", () => {
    render(<Dashboard data={getMockDashboardData()} />);
    expect(screen.getByRole("heading", { name: "길 단위 유동인구" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "주거인구" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "직장인구" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "일평균 생활인구" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "시간대별 유동인구 집중도" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "길 단위 유동인구 합계" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "요일별 길 단위 유동인구" })).not.toBeInTheDocument();
  });
});
