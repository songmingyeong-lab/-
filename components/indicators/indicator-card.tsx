import type { DashboardIndicator, DataStatus } from "@/lib/indicators/types";
import type { IndicatorScoreResult, SpatialScoringDirection } from "@/lib/scoring/types";

const labels: Record<DataStatus, string> = {
  loading: "불러오는 중", success: "수집 완료", empty: "자료 없음", stale: "갱신 필요", error: "수집 실패", mock: "공식자료 확인값", partial_success: "일부 수집",
  unsupported_geography: "지역 단위 미지원", insufficient_sample: "표본 불충분", unverified: "검증 필요", manual_verification_required: "수동 검증 필요", restricted_data: "제한 데이터",
};

const missingReasonFallback: Partial<Record<DataStatus, string>> = {
  empty: "자료원이 정상 응답했지만 해당 조건에 맞는 공개 자료가 없습니다.",
  error: "자료 수집 또는 저장 과정에서 오류가 발생했습니다.",
  unsupported_geography: "공식 자료가 선택한 행정동 단위로 제공되지 않습니다.",
  unverified: "공식 API의 조회 조건이나 자료의 지역 관련성을 아직 검증하지 못했습니다.",
  manual_verification_required: "공개 데이터만으로 판정할 수 없어 공식 목록 또는 담당자 확인이 필요합니다.",
  restricted_data: "개인정보 또는 공개 범위 제한으로 원자료를 사용할 수 없습니다.",
};

function formatCollectedAt(value: string | null) {
  if (!value) return "수집일 없음";
  return `수집 ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value))}`;
}

const scoreFormulaLabels: Record<SpatialScoringDirection, string> = {
  HIGHER_IS_BETTER: "비교율 = (대상값-비교평균)÷|비교평균|×100. +20% 이상 5점, +5~+20% 4점, -5~+5% 3점, -20~-5% 2점, -20% 이하 1점",
  LOWER_IS_BETTER: "비교율 = (대상값-비교평균)÷|비교평균|×100. -20% 이하 5점, -20~-5% 4점, -5~+5% 3점, +5~+20% 2점, +20% 이상 1점",
  BALANCED: "비교율 = (대상값-비교평균)÷|비교평균|×100. |비교율| 5% 미만 5점, 5~10% 4점, 10~20% 3점, 20~35% 2점, 35% 이상 1점",
  PERCENTILE_REFERENCE: "같은 자치구 내 점포 수 값의 백분위를 20% 단위로 나누어 1~5점으로 환산합니다. 상권 규모 참고점수이며 높고 낮음 자체가 성과를 뜻하지 않습니다.",
  INFORMATION_ONLY: "참고정보이므로 점수를 산정하지 않습니다.",
};

function formatScoreValue(value: number | null, unit: string) {
  return value === null ? "없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${unit}`;
}

export function IndicatorCard({ indicator, score }: { indicator: DashboardIndicator; score?: IndicatorScoreResult }) {
  const comparisonValues = indicator.spatialComparison?.candidates
    .map((candidate) => candidate.value)
    .filter((value): value is number => value !== null) ?? [];
  const rawComparisonMean = comparisonValues.length
    ? comparisonValues.reduce((sum, value) => sum + value, 0) / comparisonValues.length
    : null;
  const rawComparisonRate = indicator.value !== null && rawComparisonMean !== null && rawComparisonMean !== 0
    ? ((indicator.value - rawComparisonMean) / Math.abs(rawComparisonMean)) * 100
    : null;
  const comparisonRate = score?.comparisonRate ?? rawComparisonRate;
  const missingReason = indicator.value === null
    ? indicator.statusMessage ?? missingReasonFallback[indicator.status] ?? "현재 공개 자료만으로 값을 산출할 수 없습니다."
    : null;
  const statusClass = indicator.status === "mock" ? "badge-mock" : indicator.status === "success" ? "badge-success" : indicator.status === "error" ? "badge-error" : "badge-empty";
  return (
    <article className="indicator-card" aria-labelledby={`indicator-${indicator.code}`}>
      <div className="card-head"><div><div className="category">{indicator.area}</div><h3 id={`indicator-${indicator.code}`}>{indicator.name}</h3></div><span className={`badge ${statusClass}`}>{labels[indicator.status]}</span></div>
      <div className="metric"><strong>{indicator.value === null ? "자료 없음" : indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</strong>{indicator.value !== null && <span>{indicator.unit}</span>}</div>
      <div className="comparison">
        {comparisonRate === null || comparisonRate === undefined
          ? "공간 비교자료 없음"
          : <><span>{comparisonRate > 0 ? "↑" : comparisonRate < 0 ? "↓" : "→"} 비교평균 대비 {Math.abs(comparisonRate).toFixed(1)}%</span>{score && <span className="comparison-label interpret-neutral">{score.interpretation}</span>}</>}
      </div>
      {indicator.value !== null && indicator.previousValue !== null && <p className="score-interpretation">이전 분기 대비 {indicator.previousValue === 0 ? "비교 불가" : `${((indicator.value - indicator.previousValue) / Math.abs(indicator.previousValue) * 100).toFixed(1)}%`}</p>}
      {score && <section className="indicator-score" aria-label={`${indicator.name} 공공데이터 기반 지표점수`}>
        <div className="indicator-score-head"><span>공공데이터 기반 지표점수</span><strong>{score.score === null ? "산출 불가" : `${score.score.toFixed(1)} / 5.0`}</strong></div>
        <p className="score-interpretation">점수 상태: {score.scoreStatus === "CALCULATED" ? "산출 완료" : score.scoreStatus === "LIMITED_DATA" ? "제한적 비교" : score.scoreStatus === "INFORMATION_ONLY" ? "정보 제공용" : "산출 불가"} · 공간비교 점수 · {score.interpretation}</p>
        {score.scoreReason && <p className="score-reason"><strong>{score.score === null ? "이유" : "산출 주의"}:</strong> {score.scoreReason}</p>}
        <dl className="score-comparison-grid">
          <div><dt>대상</dt><dd>{score.targetAreaName}<small>{formatScoreValue(score.targetValue, score.unit)}</small></dd></div>
          <div><dt>비교평균</dt><dd>{formatScoreValue(score.comparisonMean, score.unit)}<small>{score.comparisonAreaDescription}</small></dd></div>
          <div><dt>비교중앙값</dt><dd>{formatScoreValue(score.comparisonMedian, score.unit)}</dd></div>
          {score.percentileRank !== null && score.percentileRank !== undefined && <div><dt>자치구 내 값 백분위</dt><dd>{score.percentileRank.toFixed(1)}%</dd></div>}
          <div><dt>평균 대비</dt><dd>{score.comparisonRate === null ? "산출 불가" : `${score.comparisonRate > 0 ? "+" : ""}${score.comparisonRate.toFixed(1)}%`}</dd></div>
          <div><dt>비교 대상 수</dt><dd>{score.comparisonCount}개<small>최소 {score.minimumComparisonCount}개</small></dd></div>
          <div><dt>비교범위</dt><dd>{score.comparisonAreaDescription}</dd></div>
          <div><dt>기준기간</dt><dd>{score.basePeriod ?? "없음"}</dd></div>
        </dl>
        <p className="score-direction">점수 산정식: {scoreFormulaLabels[score.direction]}</p>
        {score.direction === "BALANCED" && <p className="context-score-notice">이 지표는 높고 낮음 자체를 긍정·부정으로 단정하지 않고 같은 자치구 다른 행정동의 일반적 수준에서 벗어난 정도를 평가했습니다.</p>}
      </section>}
      {missingReason
        ? <p className="status-message data-gap-reason"><strong>자료가 없는 원인:</strong> {missingReason}</p>
        : indicator.statusMessage && <p className="status-message">{indicator.statusMessage}</p>}
      <p className="proxy"><strong>Proxy 해석:</strong> {indicator.proxyDescription}</p>
      <div className="source"><a href={indicator.sourceUrl} target="_blank" rel="noreferrer">출처: {indicator.source}</a><span>{indicator.baseDate ?? "기준일 없음"} · {formatCollectedAt(indicator.collectedAt)} · {indicator.updateCycle}</span><span>{indicator.geographicUnit}</span></div>
    </article>
  );
}
