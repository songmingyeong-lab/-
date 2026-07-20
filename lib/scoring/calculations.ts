import type { IndicatorScoreResult, ScoreStatus, SpatialScoringDirection } from "@/lib/scoring/types";

export function calculateMean(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length === 0 ? null : valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function calculateMedian(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 1 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}

export function calculateComparisonRate(targetValue: number | null, comparisonValue: number | null) {
  if (targetValue === null || comparisonValue === null || comparisonValue === 0) return null;
  return ((targetValue - comparisonValue) / Math.abs(comparisonValue)) * 100;
}

export function normalizePer10000(value: number | null, population: number | null, valuePeriod: string, populationPeriod: string) {
  if (value === null || population === null || population <= 0 || valuePeriod !== populationPeriod) return null;
  return (value / population) * 10_000;
}

export function scoreHigherIsBetter(rate: number) {
  if (rate >= 20) return 5;
  if (rate >= 5) return 4;
  if (rate > -5) return 3;
  if (rate > -20) return 2;
  return 1;
}

export function scoreLowerIsBetter(rate: number) {
  if (rate <= -20) return 5;
  if (rate <= -5) return 4;
  if (rate < 5) return 3;
  if (rate < 20) return 2;
  return 1;
}

export function scoreBalanced(rate: number) {
  const difference = Math.abs(rate);
  if (difference < 5) return 5;
  if (difference < 10) return 4;
  if (difference < 20) return 3;
  if (difference < 35) return 2;
  return 1;
}

export function calculateIndicatorScore(rate: number, direction: SpatialScoringDirection) {
  if (direction === "INFORMATION_ONLY") return null;
  const score = direction === "HIGHER_IS_BETTER" ? scoreHigherIsBetter(rate) : direction === "LOWER_IS_BETTER" ? scoreLowerIsBetter(rate) : scoreBalanced(rate);
  return Math.min(5, Math.max(1, score));
}

export function calculateDataCoverage(scores: IndicatorScoreResult[]) {
  const totalWeight = scores.reduce((sum, result) => sum + result.weight, 0);
  const availableWeight = scores.reduce((sum, result) => sum + (result.scoreStatus === "CALCULATED" ? result.weight : 0), 0);
  return totalWeight === 0 ? 0 : (availableWeight / totalWeight) * 100;
}

export function calculateCategoryScore(scores: IndicatorScoreResult[]) {
  const dataCoverage = calculateDataCoverage(scores);
  const available = scores.filter((result) => result.scoreStatus === "CALCULATED" && result.score !== null);
  const availableWeight = available.reduce((sum, result) => sum + result.weight, 0);
  const weighted = availableWeight === 0 ? null : available.reduce((sum, result) => sum + (result.score as number) * result.weight, 0) / availableWeight;
  const score = weighted === null || dataCoverage < 50 ? null : Math.round(weighted * 10) / 10;
  const scoreStatus: ScoreStatus = score === null ? "NOT_CALCULABLE" : dataCoverage < 70 ? "LIMITED_DATA" : "CALCULATED";
  return { score, scoreStatus, dataCoverage: Math.round(dataCoverage * 10) / 10 };
}

export function formatScoreInterpretation(score: number | null, direction?: SpatialScoringDirection) {
  if (score === null) return "산출 불가";
  if (direction === "BALANCED") return score >= 4.5 ? "비교집단의 일반적 수준과 유사함" : score >= 2.5 ? "비교집단과 차이 관찰 필요" : "비교집단과 차이가 큼";
  if (score >= 4.5) return "비교집단보다 유리한 수준";
  if (score >= 3.5) return "비교집단보다 다소 유리한 수준";
  if (score >= 2.5) return "비교집단 평균과 유사한 수준";
  if (score >= 1.5) return "비교집단보다 다소 불리한 수준";
  return "비교집단보다 불리한 수준";
}

