import { INDICATOR_AREA_ORDER, type DashboardIndicator } from "@/lib/indicators/types";
import { INDICATOR_SCORE_CONFIG } from "@/lib/scoring/indicator-score-config";
import { buildGuroDongComparisonGroup, buildSeoulDistrictComparisonGroup, formatComparisonScope } from "@/lib/scoring/comparison-groups";
import { calculateCategoryScore, calculateComparisonRate, calculateIndicatorScore, calculateMean, calculateMedian, formatScoreInterpretation } from "@/lib/scoring/calculations";
import type { CategoryScoreResult, IndicatorScoreConfig, IndicatorScoreResult } from "@/lib/scoring/types";

interface OfficialAreaCodes { targetDongCode: string | null; targetDistrictCode: string | null }

function emptyResult(indicator: DashboardIndicator | undefined, config: IndicatorScoreConfig, calculatedAt: string, reason: string, informationOnly = false): IndicatorScoreResult {
  const districtInformationOnly = config.indicatorCode === "noise_vibration_complaint_count" || config.indicatorCode === "resident_program_count";
  const geographicUnit = config.comparisonScope === "GURO_DONG" ? "ADMINISTRATIVE_DONG" : config.comparisonScope === "SEOUL_DISTRICT" || districtInformationOnly ? "DISTRICT" : null;
  return {
    indicatorCode: config.indicatorCode, indicatorName: indicator?.name ?? config.indicatorCode, category: config.category,
    comparisonScope: config.comparisonScope,
    targetGeographicUnit: geographicUnit,
    comparisonGeographicUnit: geographicUnit,
    targetAreaName: config.comparisonScope === "SEOUL_DISTRICT" || districtInformationOnly ? "구로구" : "가리봉동",
    comparisonAreaDescription: formatComparisonScope(config.comparisonScope), score: null,
    scoreStatus: informationOnly ? "INFORMATION_ONLY" : "NOT_CALCULABLE", scoreReason: reason, direction: config.direction,
    targetValue: indicator?.value ?? null, comparisonValue: null, comparisonMean: null, comparisonMedian: null,
    comparisonMethod: config.comparisonMethod, comparisonRate: null, difference: null, comparisonCount: 0,
    minimumComparisonCount: config.minimumComparisonCount, unit: indicator?.unit ?? "", baseDate: indicator?.baseDate ?? null,
    basePeriod: indicator?.baseDate ?? null, weight: config.weight,
    interpretation: informationOnly ? "정보 제공용 지표" : "산출 불가", dataSource: indicator?.source ?? "자료 없음", calculatedAt,
  };
}

function provisionalResult(indicator: DashboardIndicator, config: IndicatorScoreConfig, calculatedAt: string): IndicatorScoreResult {
  const district = config.comparisonScope === "SEOUL_DISTRICT";
  return {
    ...emptyResult(indicator, config, calculatedAt, "동일 공간 비교군이 없어 현재값을 기준점으로 둔 임시 3점입니다."),
    targetGeographicUnit: district ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    comparisonGeographicUnit: district ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    targetAreaName: district ? "구로구" : "가리봉동",
    comparisonAreaDescription: "대체 기준(동일 공간 비교자료 미확보)",
    score: 3,
    scoreStatus: "CALCULATED",
    targetValue: indicator.value,
    comparisonValue: indicator.value,
    comparisonMean: indicator.value,
    comparisonMedian: indicator.value,
    comparisonRate: 0,
    difference: 0,
    interpretation: "대체 산출: 비교자료 확보 전 중립 기준점",
  };
}

export function calculateDashboardScores(indicators: DashboardIndicator[], officialCodes: OfficialAreaCodes, calculatedAt = new Date().toISOString()): CategoryScoreResult[] {
  const indicatorByCode = new Map(indicators.map((indicator) => [indicator.code, indicator]));
  const results = INDICATOR_SCORE_CONFIG.filter((config) => config.enabled).map((config): IndicatorScoreResult => {
    const indicator = indicatorByCode.get(config.indicatorCode);
    if (config.comparisonScope === "INFORMATION_ONLY" || config.direction === "INFORMATION_ONLY") return emptyResult(indicator, config, calculatedAt, config.informationOnlyReason ?? "정보 제공용 지표입니다.", true);
    if (!indicator) return emptyResult(indicator, config, calculatedAt, "대시보드에 지표가 없습니다.");
    if (indicator.value === null) return emptyResult(indicator, config, calculatedAt, indicator.statusMessage ?? "대상값이 없습니다.");
    if (!indicator.spatialComparison) return config.allowProvisionalScore
      ? provisionalResult(indicator, config, calculatedAt)
      : emptyResult(indicator, config, calculatedAt, "동일 공간단위 비교자료가 수집되지 않았습니다.");
    if (!officialCodes.targetDongCode || !officialCodes.targetDistrictCode) return emptyResult(indicator, config, calculatedAt, "공식 지역코드 설정이 없습니다.");
    try {
      const values = [indicator.spatialComparison.target, ...indicator.spatialComparison.candidates];
      const group = config.comparisonScope === "GURO_DONG"
        ? buildGuroDongComparisonGroup(values, officialCodes.targetDongCode, officialCodes.targetDistrictCode)
        : buildSeoulDistrictComparisonGroup(values, officialCodes.targetDistrictCode);
      const comparisonMean = calculateMean(group.comparisons.map((value) => value.value));
      const comparisonMedian = calculateMedian(group.comparisons.map((value) => value.value));
      const comparisonValue = config.comparisonMethod === "MEAN" ? comparisonMean : comparisonMedian;
      if (group.comparisons.length === 0 && config.allowProvisionalScore) return provisionalResult(indicator, config, calculatedAt);
      if (group.comparisons.length < config.minimumComparisonCount && (!config.allowRelaxedMinimum || group.comparisons.length === 0)) return {
        ...emptyResult(indicator, config, calculatedAt, `유효 비교 대상이 ${group.comparisons.length}개로 최소 ${config.minimumComparisonCount}개보다 적습니다.`),
        targetGeographicUnit: group.target.geographicUnit,
        comparisonGeographicUnit: group.target.geographicUnit,
        targetAreaName: group.target.areaName,
        targetValue: group.target.value,
        comparisonValue,
        comparisonMean,
        comparisonMedian,
        comparisonCount: group.comparisons.length,
        unit: group.target.unit,
        basePeriod: group.target.basePeriod,
      };
      const comparisonRate = calculateComparisonRate(group.target.value, comparisonValue);
      if (group.target.value === null || comparisonValue === null || comparisonRate === null) return emptyResult(indicator, config, calculatedAt, "대상값 또는 비교값이 없어 비교율을 계산할 수 없습니다.");
      const score = calculateIndicatorScore(comparisonRate, config.direction);
      if (score === null) return emptyResult(indicator, config, calculatedAt, "정보 제공용 지표입니다.", true);
      const relaxedSource = group.target.geographicUnit === "LEGAL_DONG" || group.comparisons.some((value) => value.areaCode.startsWith("NAME:") || value.areaCode.startsWith("LEGAL:"));
      const relaxedSample = group.comparisons.length < config.minimumComparisonCount;
      const comparisonAreaDescription = relaxedSource
        ? `${formatComparisonScope(config.comparisonScope)} (명칭·법정동 기반 대체비교)`
        : formatComparisonScope(config.comparisonScope);
      return {
        indicatorCode: indicator.code, indicatorName: indicator.name, category: config.category, comparisonScope: config.comparisonScope,
        targetGeographicUnit: group.target.geographicUnit, comparisonGeographicUnit: group.target.geographicUnit,
        targetAreaName: group.target.areaName, comparisonAreaDescription,
        score, scoreStatus: "CALCULATED", scoreReason: relaxedSource || relaxedSample ? `엄격 비교 조건을 완화한 참고점수입니다.${relaxedSample ? ` 비교 대상은 권장 최소 ${config.minimumComparisonCount}개보다 적은 ${group.comparisons.length}개입니다.` : ""}` : null, direction: config.direction,
        targetValue: group.target.value, comparisonValue, comparisonMean, comparisonMedian, comparisonMethod: config.comparisonMethod,
        comparisonRate, difference: group.target.value - comparisonValue, comparisonCount: group.comparisons.length,
        minimumComparisonCount: config.minimumComparisonCount, unit: group.target.unit, baseDate: indicator.baseDate,
        basePeriod: group.target.basePeriod, weight: config.weight, interpretation: formatScoreInterpretation(score, config.direction),
        dataSource: indicator.source, calculatedAt,
      };
    } catch (error) {
      return emptyResult(indicator, config, calculatedAt, error instanceof Error ? error.message : "공간 비교 설정 오류");
    }
  });
  return INDICATOR_AREA_ORDER.map((category) => {
    const indicatorScores = results.filter((result) => result.category === category);
    return { category, categoryName: category, ...calculateCategoryScore(indicatorScores), availableIndicatorCount: indicatorScores.filter((result) => result.scoreStatus === "CALCULATED").length, totalIndicatorCount: indicatorScores.length, indicatorScores, calculatedAt };
  });
}
