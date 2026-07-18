export type DataStatus = "loading" | "success" | "empty" | "stale" | "error" | "mock" | "partial_success";

export type FavorableDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "NEUTRAL" | "CONTEXT_DEPENDENT";

export interface SeriesPoint { date: string; value: number | null }

export interface DashboardIndicator {
  code: string;
  name: string;
  category: string;
  value: number | null;
  previousValue: number | null;
  unit: string;
  baseDate: string | null;
  comparisonLabel: string;
  favorableDirection: FavorableDirection;
  status: DataStatus;
  source: string;
  sourceUrl: string;
  geographicUnit: string;
  proxyDescription: string;
  series: SeriesPoint[];
}

export interface DashboardData {
  mode: "mock" | "live";
  area: {
    slug: string;
    name: string;
    districtName: string;
    projectName: string;
    projectPeriod: string;
    projectType: string;
    scope: string;
  };
  lastCollectedAt: string | null;
  status: DataStatus;
  indicators: DashboardIndicator[];
}
