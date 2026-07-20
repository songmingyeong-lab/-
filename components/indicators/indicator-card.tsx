import { IndicatorChart } from "@/components/charts/indicator-chart";
import type { DashboardIndicator, DataStatus } from "@/lib/indicators/types";
import type { IndicatorScoreResult, SpatialScoringDirection } from "@/lib/scoring/types";

const labels: Record<DataStatus, string> = {
  loading: "불러오는 중", success: "수집 완료", empty: "자료 없음", stale: "갱신 필요", error: "수집 실패", mock: "공식자료 확인값", partial_success: "일부 수집",
  unsupported_geography: "지역 단위 미지원", insufficient_sample: "표본 불충분", unverified: "검증 필요", manual_verification_required: "수동 검증 필요", restricted_data: "제한 데이터",
};

const missingReasonFallback: Partial<Record<DataStatus, string>> = {
  empty: "자료원이 정상 응답했지만 해당 조건에 맞는 공개 자료가 없습니다.",
  error: "자료 수집 또는 저장 과정에서 오류가 발생했습니다.",
  unsupported_geography: "공식 자료가 가리봉동 단위로 제공되지 않습니다.",
  unverified: "공식 API의 조회 조건이나 자료의 지역 관련성을 아직 검증하지 못했습니다.",
  manual_verification_required: "공개 데이터만으로 판정할 수 없어 공식 목록 또는 담당자 확인이 필요합니다.",
  restricted_data: "개인정보 또는 공개 범위 제한으로 원자료를 사용할 수 없습니다.",
};

function formatCollectedAt(value: string | null) {
  if (!value) return "수집일 없음";
  return `수집 ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value))}`;
}

const directionLabels: Record<SpatialScoringDirection, string> = {
  HIGHER_IS_BETTER: "증가 시 개선 방향",
  LOWER_IS_BETTER: "감소 시 개선 방향",
  BALANCED: "비교집단과의 편차 기준",
  INFORMATION_ONLY: "정보 제공용",
};

function formatScoreValue(value: number | null, unit: string) {
  return value === null ? "없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${unit}`;
}

export function IndicatorCard({ indicator, score }: { indicator: DashboardIndicator; score?: IndicatorScoreResult }) {
  const missingReason = indicator.value === null
    ? indicator.statusMessage ?? missingReasonFallback[indicator.status] ?? "현재 공개 자료만으로 값을 산출할 수 없습니다."
    : null;
  const statusClass = indicator.status === "mock" ? "badge-mock" : indicator.status === "success" ? "badge-success" : indicator.status === "error" ? "badge-error" : "badge-empty";
  return (
    <article className="indicator-card" aria-labelledby={`indicator-${indicator.code}`}>
      <div className="card-head"><div><div className="category">{indicator.area}</div><h3 id={`indicator-${indicator.code}`}>{indicator.name}</h3></div><span className={`badge ${statusClass}`}>{labels[indicator.status]}</span></div>
      <div className="metric"><strong>{indicator.value === null ? "자료 없음" : indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</strong>{indicator.value !== null && <span>{indicator.unit}</span>}</div>
      <div className="comparison">
        {score?.comparisonRate === null || score?.comparisonRate === undefined
          ? "공간 비교자료 없음"
          : <><span>{score.comparisonRate > 0 ? "↑" : score.comparisonRate < 0 ? "↓" : "→"} 비교평균 대비 {Math.abs(score.comparisonRate).toFixed(1)}%</span><span className="comparison-label interpret-neutral">{score.interpretation}</span></>}
      </div>
      {score && <section className="indicator-score" aria-label={`${indicator.name} 공공데이터 기반 지표점수`}>
        <div className="indicator-score-head"><span>공공데이터 기반 지표점수</span><strong>{score.score === null ? "산출 불가" : `${score.score.toFixed(1)} / 5.0`}</strong></div>
        <p className="score-interpretation">점수 상태: {score.scoreStatus === "CALCULATED" ? "산출 완료" : score.scoreStatus === "INFORMATION_ONLY" ? "정보 제공용" : "산출 불가"} · 공간비교 점수 · {score.interpretation}</p>
        {score.scoreReason && <p className="score-reason"><strong>{score.score === null ? "이유" : "산출 주의"}:</strong> {score.scoreReason}</p>}
        <dl className="score-comparison-grid">
          <div><dt>대상</dt><dd>{score.targetAreaName}<small>{formatScoreValue(score.targetValue, score.unit)}</small></dd></div>
          <div><dt>비교평균</dt><dd>{formatScoreValue(score.comparisonMean, score.unit)}<small>{score.comparisonAreaDescription}</small></dd></div>
          <div><dt>평균 대비</dt><dd>{score.comparisonRate === null ? "산출 불가" : `${score.comparisonRate > 0 ? "+" : ""}${score.comparisonRate.toFixed(1)}%`}</dd></div>
          <div><dt>비교 대상 수</dt><dd>{score.comparisonCount}개<small>최소 {score.minimumComparisonCount}개</small></dd></div>
          <div><dt>비교범위</dt><dd>{score.comparisonAreaDescription}</dd></div>
          <div><dt>기준기간</dt><dd>{score.basePeriod ?? "없음"}</dd></div>
        </dl>
        <p className="score-direction">산정 방향: {directionLabels[score.direction]}</p>
        {score.direction === "BALANCED" && <p className="context-score-notice">이 지표는 높고 낮음 자체를 긍정·부정으로 단정하지 않고 구로구 다른 행정동의 일반적 수준에서 벗어난 정도를 평가했습니다.</p>}
      </section>}
      <IndicatorChart data={indicator.series} unit={indicator.unit} name={indicator.name} />
      {missingReason
        ? <p className="status-message data-gap-reason"><strong>자료가 없는 원인:</strong> {missingReason}</p>
        : indicator.statusMessage && <p className="status-message">{indicator.statusMessage}</p>}
      <p className="proxy"><strong>Proxy 해석:</strong> {indicator.proxyDescription}</p>
      <div className="source"><a href={indicator.sourceUrl} target="_blank" rel="noreferrer">출처: {indicator.source}</a><span>{indicator.baseDate ?? "기준일 없음"} · {formatCollectedAt(indicator.collectedAt)} · {indicator.updateCycle}</span><span>{indicator.geographicUnit}</span></div>
    </article>
  );
}
