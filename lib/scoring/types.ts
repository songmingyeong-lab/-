import type { IndicatorArea } from "@/lib/indicators/types";

export type ComparisonScope = "GURO_DONG" | "SEOUL_DISTRICT" | "INFORMATION_ONLY";
export type SpatialScoringDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "BALANCED" | "INFORMATION_ONLY";
export type ComparisonMethod = "MEAN" | "MEDIAN";
export type ScoreStatus = "CALCULATED" | "LIMITED_DATA" | "NOT_CALCULABLE" | "INFORMATION_ONLY";
export type SpatialGeographicUnit = "ADMINISTRATIVE_DONG" | "LEGAL_DONG" | "DISTRICT";
export type NormalizationMethod = "NONE" | "PER_10000_RESIDENTS" | "PER_STORE";
export type DenominatorType = "NONE" | "REGISTERED_POPULATION" | "STORE_COUNT";

export interface ScoreThresholds {
  directionalNeutralPercent: number;
  directionalStrongPercent: number;
  balancedBandsPercent: [number, number, number, number];
}

export interface ComparableAreaValue {
  areaCode: string;
  areaName: string;
  cityCode: string;
  districtCode: string;
  geographicUnit: SpatialGeographicUnit;
  basePeriod: string;
  unit: string;
  value: number | null;
}

export interface SpatialComparisonData {
  target: ComparableAreaValue;
  candidates: ComparableAreaValue[];
}

export interface IndicatorScoreConfig {
  indicatorCode: string;
  category: IndicatorArea;
  comparisonScope: ComparisonScope;
  direction: SpatialScoringDirection;
  weight: number;
  comparisonMethod: ComparisonMethod;
  minimumComparisonCount: number;
  normalizationMethod: NormalizationMethod;
  denominatorType: DenominatorType;
  enabled: boolean;
  scoreThresholds: ScoreThresholds;
  allowProvisionalScore?: boolean;
  allowRelaxedMinimum?: boolean;
  informationOnlyReason?: string;
}

export interface IndicatorScoreResult {
  indicatorCode: string;
  indicatorName: string;
  category: IndicatorArea;
  comparisonScope: ComparisonScope;
  targetGeographicUnit: SpatialGeographicUnit | null;
  comparisonGeographicUnit: SpatialGeographicUnit | null;
  targetAreaName: string;
  comparisonAreaDescription: string;
  score: number | null;
  scoreStatus: ScoreStatus;
  scoreReason: string | null;
  direction: SpatialScoringDirection;
  targetValue: number | null;
  comparisonValue: number | null;
  comparisonMean: number | null;
  comparisonMedian: number | null;
  comparisonMethod: ComparisonMethod;
  comparisonRate: number | null;
  difference: number | null;
  comparisonCount: number;
  minimumComparisonCount: number;
  unit: string;
  baseDate: string | null;
  basePeriod: string | null;
  weight: number;
  interpretation: string;
  dataSource: string;
  calculatedAt: string;
}

export interface CategoryScoreResult {
  category: IndicatorArea;
  categoryName: IndicatorArea;
  score: number | null;
  scoreStatus: ScoreStatus;
  dataCoverage: number;
  availableIndicatorCount: number;
  totalIndicatorCount: number;
  indicatorScores: IndicatorScoreResult[];
  calculatedAt: string;
}
