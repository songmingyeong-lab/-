import type { IndicatorScoreConfig } from "@/lib/scoring/types";

export const SCORING_VERSION = "v2-mixed-geography-comparison";
export const SCORING_NOTICE = "공공데이터 기반 지표점수는 같은 원천·기준기간·단위의 공간 비교값으로 계산하며 주민 만족도나 도시재생 사업 성패를 뜻하지 않습니다.";

export const DEFAULT_SCORE_THRESHOLDS = {
  directionalNeutralPercent: 5,
  directionalStrongPercent: 20,
  balancedBandsPercent: [5, 10, 20, 35],
} as const;

const indicatorScoreConfigs: Omit<IndicatorScoreConfig, "scoreThresholds">[] = [
  { indicatorCode: "aged_building_ratio", category: "주거환경", comparisonScope: "GURO_DONG", direction: "LOWER_IS_BETTER", weight: 0.5, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowRelaxedMinimum: true },
  { indicatorCode: "vacant_house_count", category: "주거환경", comparisonScope: "INFORMATION_ONLY", direction: "INFORMATION_ONLY", weight: 0.5, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, informationOnlyReason: "가리봉동과 비교집단에 동일하게 적용할 수 있는 공식 빈집 자료가 없습니다." },
  { indicatorCode: "road_excavation_active_count", category: "생활 불편", comparisonScope: "GURO_DONG", direction: "LOWER_IS_BETTER", weight: 0.4, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowRelaxedMinimum: true },
  { indicatorCode: "noise_vibration_complaint_count", category: "생활 불편", comparisonScope: "SEOUL_DISTRICT", direction: "LOWER_IS_BETTER", weight: 0.6, comparisonMethod: "MEAN", minimumComparisonCount: 10, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowProvisionalScore: true },
  { indicatorCode: "store_count", category: "상권 변화", comparisonScope: "GURO_DONG", direction: "BALANCED", weight: 0.15, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "opening_rate", category: "상권 변화", comparisonScope: "GURO_DONG", direction: "HIGHER_IS_BETTER", weight: 0.1, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "closing_rate", category: "상권 변화", comparisonScope: "GURO_DONG", direction: "LOWER_IS_BETTER", weight: 0.25, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "median_monthly_rent", category: "상권 변화", comparisonScope: "GURO_DONG", direction: "LOWER_IS_BETTER", weight: 0.25, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowRelaxedMinimum: true, allowProvisionalScore: true },
  { indicatorCode: "estimated_sales", category: "상권 변화", comparisonScope: "GURO_DONG", direction: "HIGHER_IS_BETTER", weight: 0.25, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "PER_STORE", denominatorType: "STORE_COUNT", enabled: true },
  { indicatorCode: "living_population", category: "활력·혼잡", comparisonScope: "GURO_DONG", direction: "BALANCED", weight: 0.4, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "floating_population", category: "활력·혼잡", comparisonScope: "GURO_DONG", direction: "BALANCED", weight: 0.35, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "peak_floating_time_band", category: "활력·혼잡", comparisonScope: "GURO_DONG", direction: "BALANCED", weight: 0.25, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true },
  { indicatorCode: "resident_program_count", category: "공동체·거점", comparisonScope: "SEOUL_DISTRICT", direction: "HIGHER_IS_BETTER", weight: 0.5, comparisonMethod: "MEAN", minimumComparisonCount: 10, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowRelaxedMinimum: true },
  { indicatorCode: "urban_regeneration_hub_count", category: "공동체·거점", comparisonScope: "GURO_DONG", direction: "HIGHER_IS_BETTER", weight: 0.5, comparisonMethod: "MEAN", minimumComparisonCount: 5, normalizationMethod: "NONE", denominatorType: "NONE", enabled: true, allowRelaxedMinimum: true },
];

export const INDICATOR_SCORE_CONFIG: IndicatorScoreConfig[] = indicatorScoreConfigs.map((config) => ({
  ...config,
  scoreThresholds: { ...DEFAULT_SCORE_THRESHOLDS, balancedBandsPercent: [...DEFAULT_SCORE_THRESHOLDS.balancedBandsPercent] },
}));

export const INDICATOR_SCORE_CONFIG_BY_CODE = new Map(INDICATOR_SCORE_CONFIG.map((config) => [config.indicatorCode, config]));
