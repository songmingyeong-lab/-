import { INDICATOR_AREA_ORDER, type DashboardIndicator } from "@/lib/indicators/types";
import { INDICATOR_SCORE_CONFIG } from "@/lib/scoring/indicator-score-config";
import { buildGuroDongComparisonGroup, buildSeoulDistrictComparisonGroup, formatComparisonScope } from "@/lib/scoring/comparison-groups";
import { calculateCategoryScore, calculateComparisonRate, calculateIndicatorScore, calculateMean, calculateMedian, formatScoreInterpretation } from "@/lib/scoring/calculations";
import type { CategoryScoreResult, IndicatorScoreConfig, IndicatorScoreResult } from "@/lib/scoring/types";

interface OfficialAreaCodes {
  targetDongCode: string | null;
  targetDistrictCode: string | null;
  targetDongName?: string;
  targetDistrictName?: string;
}

function emptyResult(indicator: DashboardIndicator | undefined, config: IndicatorScoreConfig, calculatedAt: string, reason: string, officialCodes: OfficialAreaCodes, informationOnly = false): IndicatorScoreResult {
  const districtInformationOnly = config.indicatorCode === "noise_vibration_complaint_count" || config.indicatorCode === "resident_program_count";
  const geographicUnit = config.comparisonScope === "GURO_DONG" ? "ADMINISTRATIVE_DONG" : config.comparisonScope === "SEOUL_DISTRICT" || districtInformationOnly ? "DISTRICT" : null;
  const dongName = officialCodes.targetDongName ?? "가리봉동";
  const districtName = officialCodes.targetDistrictName ?? "구로구";
  return {
    indicatorCode: config.indicatorCode, indicatorName: indicator?.name ?? config.indicatorCode, category: config.category,
    comparisonScope: config.comparisonScope,
    targetGeographicUnit: geographicUnit,
    comparisonGeographicUnit: geographicUnit,
    targetAreaName: config.comparisonScope === "SEOUL_DISTRICT" || districtInformationOnly ? districtName : dongName,
    comparisonAreaDescription: formatComparisonScope(config.comparisonScope, dongName, districtName), score: null,
    scoreStatus: informationOnly ? "INFORMATION_ONLY" : "NOT_CALCULABLE", scoreReason: reason, direction: config.direction,
    targetValue: indicator?.value ?? null, comparisonValue: null, comparisonMean: null, comparisonMedian: null,
    comparisonMethod: config.comparisonMethod, comparisonRate: null, difference: null, comparisonCount: 0,
    minimumComparisonCount: config.minimumComparisonCount, unit: indicator?.unit ?? "", baseDate: indicator?.baseDate ?? null,
    basePeriod: indicator?.baseDate ?? null, weight: config.weight,
    interpretation: informationOnly ? "정보 제공용 지표" : "산출 불가", dataSource: indicator?.source ?? "자료 없음", calculatedAt,
  };
}

function provisionalResult(indicator: DashboardIndicator, config: IndicatorScoreConfig, calculatedAt: string, officialCodes: OfficialAreaCodes): IndicatorScoreResult {
  const district = config.comparisonScope === "SEOUL_DISTRICT";
  return {
    ...emptyResult(indicator, config, calculatedAt, "동일 공간 비교군이 없어 현재값을 기준점으로 둔 임시 3점입니다.", officialCodes),
    targetGeographicUnit: district ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    comparisonGeographicUnit: district ? "DISTRICT" : "ADMINISTRATIVE_DONG",
    targetAreaName: district ? officialCodes.targetDistrictName ?? "구로구" : officialCodes.targetDongName ?? "가리봉동",
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
    if (config.comparisonScope === "INFORMATION_ONLY" || config.direction === "INFORMATION_ONLY") return emptyResult(indicator, config, calculatedAt, config.informationOnlyReason ?? "정보 제공용 지표입니다.", officialCodes, true);
    if (!indicator) return emptyResult(indicator, config, calculatedAt, "대시보드에 지표가 없습니다.", officialCodes);
    if (indicator.value === null) return emptyResult(indicator, config, calculatedAt, indicator.statusMessage ?? "대상값이 없습니다.", officialCodes);
    if (!indicator.spatialComparison) return config.allowProvisionalScore
      ? provisionalResult(indicator, config, calculatedAt, officialCodes)
      : emptyResult(indicator, config, calculatedAt, "동일 공간단위 비교자료가 수집되지 않았습니다.", officialCodes);
    if (!officialCodes.targetDongCode || !officialCodes.targetDistrictCode) return emptyResult(indicator, config, calculatedAt, "공식 지역코드 설정이 없습니다.", officialCodes);
    try {
      const values = [indicator.spatialComparison.target, ...indicator.spatialComparison.candidates];
      const group = config.comparisonScope === "GURO_DONG"
        ? buildGuroDongComparisonGroup(values, officialCodes.targetDongCode, officialCodes.targetDistrictCode)
        : buildSeoulDistrictComparisonGroup(values, officialCodes.targetDistrictCode);
      const comparisonMean = calculateMean(group.comparisons.map((value) => value.value));
      const comparisonMedian = calculateMedian(group.comparisons.map((value) => value.value));
      const comparisonValue = config.comparisonMethod === "MEAN" ? comparisonMean : comparisonMedian;
      if (group.comparisons.length === 0 && config.allowProvisionalScore) return provisionalResult(indicator, config, calculatedAt, officialCodes);
      const districtDongComparison = config.comparisonScope === "GURO_DONG";
      const insufficientDistrictComparison = districtDongComparison && group.comparisons.length < 5;
      if (insufficientDistrictComparison || (group.comparisons.length < config.minimumComparisonCount && (!config.allowRelaxedMinimum || group.comparisons.length === 0))) return {
        ...emptyResult(
          indicator,
          config,
          calculatedAt,
          insufficientDistrictComparison
            ? "같은 자치구 내 비교 가능한 행정동 데이터가 부족해 상대점수를 산정하지 않았습니다."
            : `유효 비교 대상이 ${group.comparisons.length}개로 최소 ${config.minimumComparisonCount}개보다 적습니다.`,
          officialCodes,
        ),
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
        comparisonQuality: "insufficient",
      };
      const comparisonRate = calculateComparisonRate(group.target.value, comparisonValue);
      if (group.target.value === null || comparisonValue === null || comparisonRate === null) return emptyResult(indicator, config, calculatedAt, "대상값 또는 비교값이 없어 비교율을 계산할 수 없습니다.", officialCodes);
      const score = calculateIndicatorScore(comparisonRate, config.direction);
      if (score === null) return emptyResult(indicator, config, calculatedAt, "정보 제공용 지표입니다.", officialCodes, true);
      const relaxedSource = group.target.geographicUnit === "LEGAL_DONG" || group.comparisons.some((value) => value.areaCode.startsWith("NAME:") || value.areaCode.startsWith("LEGAL:"));
      const relaxedSample = group.comparisons.length < config.minimumComparisonCount;
      const limitedDistrictComparison = districtDongComparison && group.comparisons.length < 10;
      const comparisonAreaDescription = limitedDistrictComparison
        ? `${officialCodes.targetDistrictName ?? "같은 자치구"} 수집된 행정동 기준 (자치구 전체 아님)`
        : relaxedSource
        ? `${formatComparisonScope(config.comparisonScope, officialCodes.targetDongName, officialCodes.targetDistrictName)} (명칭·법정동 기반 대체비교)`
        : formatComparisonScope(config.comparisonScope, officialCodes.targetDongName, officialCodes.targetDistrictName);
      const allValues = [group.target.value, ...group.comparisons.map((value) => value.value)].filter((value): value is number => value !== null);
      const percentileRank = allValues.length > 0
        ? ((allValues.filter((value) => value < group.target.value!).length
          + allValues.filter((value) => value === group.target.value).length * 0.5) / allValues.length) * 100
        : null;
      return {
        indicatorCode: indicator.code, indicatorName: indicator.name, category: config.category, comparisonScope: config.comparisonScope,
        targetGeographicUnit: group.target.geographicUnit, comparisonGeographicUnit: group.target.geographicUnit,
        targetAreaName: group.target.areaName, comparisonAreaDescription,
        score,
        scoreStatus: limitedDistrictComparison ? "LIMITED_DATA" : "CALCULATED",
        scoreReason: limitedDistrictComparison
          ? "현재 수집된 일부 행정동만을 기준으로 계산한 제한적 비교값입니다."
          : relaxedSource || relaxedSample ? `엄격 비교 조건을 완화한 참고점수입니다.${relaxedSample ? ` 비교 대상은 권장 최소 ${config.minimumComparisonCount}개보다 적은 ${group.comparisons.length}개입니다.` : ""}` : null,
        direction: config.direction,
        targetValue: group.target.value, comparisonValue, comparisonMean, comparisonMedian, comparisonMethod: config.comparisonMethod,
        comparisonRate, difference: group.target.value - comparisonValue, comparisonCount: group.comparisons.length,
        minimumComparisonCount: config.minimumComparisonCount, unit: group.target.unit, baseDate: indicator.baseDate,
        basePeriod: group.target.basePeriod, weight: config.weight, interpretation: formatScoreInterpretation(score, config.direction),
        dataSource: indicator.source,
        calculatedAt,
        comparisonQuality: limitedDistrictComparison ? "low" : districtDongComparison ? "normal" : undefined,
        percentileRank,
      };
    } catch (error) {
      return emptyResult(indicator, config, calculatedAt, error instanceof Error ? error.message : "공간 비교 설정 오류", officialCodes);
    }
  });
  return INDICATOR_AREA_ORDER.map((category) => {
    const indicatorScores = results.filter((result) => result.category === category);
    return { category, categoryName: category, ...calculateCategoryScore(indicatorScores), availableIndicatorCount: indicatorScores.filter((result) => ["CALCULATED", "LIMITED_DATA"].includes(result.scoreStatus)).length, totalIndicatorCount: indicatorScores.length, indicatorScores, calculatedAt };
  });
}
