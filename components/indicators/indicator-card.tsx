import { IndicatorChart } from "@/components/charts/indicator-chart";
import { calculateChange, calculateChangeRate, interpretChange } from "@/lib/indicators/calculations";
import type { DashboardIndicator, DataStatus } from "@/lib/indicators/types";

const labels: Record<DataStatus, string> = {
  loading: "불러오는 중", success: "수집 완료", empty: "자료 없음", stale: "갱신 필요", error: "수집 실패", mock: "예시 데이터", partial_success: "일부 수집",
  unsupported_geography: "지역 단위 미지원", insufficient_sample: "표본 불충분", unverified: "검증 필요", manual_verification_required: "수동 검증 필요", restricted_data: "제한 데이터",
};

function formatCollectedAt(value: string | null) {
  if (!value) return "수집일 없음";
  return `수집 ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(value))}`;
}

export function IndicatorCard({ indicator }: { indicator: DashboardIndicator }) {
  const change = calculateChange(indicator.value, indicator.previousValue);
  const rate = calculateChangeRate(indicator.value, indicator.previousValue);
  const interpretation = interpretChange(change, indicator.favorableDirection);
  const interpretationClass = interpretation === "개선 가능성" ? "interpret-good" : interpretation === "악화 가능성" ? "interpret-bad" : interpretation === "해석 주의" ? "interpret-caution" : "interpret-neutral";
  const statusClass = indicator.status === "mock" ? "badge-mock" : indicator.status === "success" ? "badge-success" : indicator.status === "error" ? "badge-error" : "badge-empty";
  return (
    <article className="indicator-card" aria-labelledby={`indicator-${indicator.code}`}>
      <div className="card-head"><div><div className="category">{indicator.area}</div><h3 id={`indicator-${indicator.code}`}>{indicator.name}</h3></div><span className={`badge ${statusClass}`}>{labels[indicator.status]}</span></div>
      <div className="metric"><strong>{indicator.value === null ? "자료 없음" : indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</strong>{indicator.value !== null && <span>{indicator.unit}</span>}</div>
      <div className="comparison">
        {change === null ? "비교 자료 없음" : <><span aria-label={change > 0 ? "증가" : change < 0 ? "감소" : "변화 없음"}>{change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}{indicator.unit}</span>{rate !== null && <span> ({rate > 0 ? "+" : ""}{rate.toFixed(1)}%)</span>}<span className={`comparison-label ${interpretationClass}`}>{interpretation}</span></>}
      </div>
      <IndicatorChart data={indicator.series} unit={indicator.unit} name={indicator.name} />
      {indicator.statusMessage && <p className="status-message">{indicator.statusMessage}</p>}
      <p className="proxy"><strong>Proxy 해석:</strong> {indicator.proxyDescription}</p>
      <div className="source"><a href={indicator.sourceUrl} target="_blank" rel="noreferrer">출처: {indicator.source}</a><span>{indicator.baseDate ?? "기준일 없음"} · {formatCollectedAt(indicator.collectedAt)} · {indicator.updateCycle}</span><span>{indicator.geographicUnit}</span></div>
    </article>
  );
}
