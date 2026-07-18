import { IndicatorChart } from "@/components/charts/indicator-chart";
import { calculateChange, calculateChangeRate, interpretChange } from "@/lib/indicators/calculations";
import type { DashboardIndicator, DataStatus } from "@/lib/indicators/types";

const labels: Record<DataStatus, string> = { loading: "불러오는 중", success: "수집 완료", empty: "자료원 검증 불충분", stale: "최근 정상 수집값", error: "수집 실패", mock: "예시 데이터", partial_success: "일부 수집" };

export function IndicatorCard({ indicator }: { indicator: DashboardIndicator }) {
  const change = calculateChange(indicator.value, indicator.previousValue);
  const rate = calculateChangeRate(indicator.value, indicator.previousValue);
  const interpretation = interpretChange(change, indicator.favorableDirection);
  const interpretationClass = interpretation === "개선 가능성" ? "interpret-good" : interpretation === "악화 가능성" ? "interpret-bad" : interpretation === "해석 주의" ? "interpret-caution" : "interpret-neutral";
  const statusClass = indicator.status === "mock" ? "badge-mock" : indicator.status === "success" ? "badge-success" : indicator.status === "error" ? "badge-error" : "badge-empty";
  return (
    <article className="indicator-card" aria-labelledby={`indicator-${indicator.code}`}>
      <div className="card-head"><div><div className="category">{indicator.category}</div><h3 id={`indicator-${indicator.code}`}>{indicator.name}</h3></div><span className={`badge ${statusClass}`}>{labels[indicator.status]}</span></div>
      <div className="metric"><strong>{indicator.value === null ? "자료 없음" : indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}</strong>{indicator.value !== null && <span>{indicator.unit}</span>}</div>
      <div className="comparison">
        {change === null ? "비교 자료 없음" : <><span aria-label={change > 0 ? "증가" : change < 0 ? "감소" : "변화 없음"}>{change > 0 ? "↑" : change < 0 ? "↓" : "→"} {Math.abs(change).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}{indicator.unit}</span>{rate !== null && <span> ({rate > 0 ? "+" : ""}{rate.toFixed(1)}%)</span>}<span className={`comparison-label ${interpretationClass}`}>{interpretation}</span></>}
      </div>
      <IndicatorChart data={indicator.series} unit={indicator.unit} name={indicator.name} />
      <p className="proxy"><strong>Proxy 해석:</strong> {indicator.proxyDescription}</p>
      <div className="source"><a href={indicator.sourceUrl} target="_blank" rel="noreferrer">출처: {indicator.source}</a><span>{indicator.baseDate ?? "기준일 없음"} · {indicator.geographicUnit}</span></div>
    </article>
  );
}
