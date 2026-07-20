import type { CategoryScoreResult, SpatialComparisonData } from "@/lib/scoring/types";

export const INDICATOR_AREA_ORDER = ["주거환경", "생활 불편", "상권 변화", "활력·혼잡", "공동체·거점"] as const;
export type IndicatorArea = (typeof INDICATOR_AREA_ORDER)[number];

export type DataStatus = "loading" | "success" | "empty" | "stale" | "error" | "mock" | "partial_success" | "unsupported_geography" | "insufficient_sample" | "unverified" | "manual_verification_required" | "restricted_data";
export type FavorableDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "NEUTRAL" | "CONTEXT_DEPENDENT";
export interface SeriesPoint { date: string; value: number | null }

export interface DashboardIndicator {
  code: string;
  name: string;
  area: IndicatorArea;
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
  collectedAt: string | null;
  updateCycle: string;
  statusMessage: string | null;
  proxyDescription: string;
  series: SeriesPoint[];
  spatialComparison?: SpatialComparisonData;
}

export interface DashboardData {
  mode: "mock" | "live";
  area: {
    slug: string;
    name: string;
    districtName: string;
    administrativeDongName: string;
    administrativeDongCode: string | null;
    legalDongName: string;
    legalDongCode: string | null;
    projectName: string;
    projectType: string;
    scope: string;
  };
  lastCollectedAt: string | null;
  status: DataStatus;
  indicators: DashboardIndicator[];
  categoryScores: CategoryScoreResult[];
  scoringVersion: string;
  scoringNotice: string;
}
