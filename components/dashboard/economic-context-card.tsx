import type { DashboardIndicator } from "@/lib/indicators/types";

const fields = [
  ["monthly_average_income", "월평균 소득"],
  ["income_level", "소득분위"],
  ["median_monthly_rent", "주거 월세 중위값"],
  ["rent_level", "상가 환산임대료"],
] as const;

type AvailableIndicator = DashboardIndicator & { value: number };

function comparisonMean(indicator?: DashboardIndicator) {
  const values = indicator?.spatialComparison?.candidates
    .map((candidate) => candidate.value)
    .filter((value): value is number => value !== null) ?? [];
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function valueLabel(indicator: AvailableIndicator) {
  return `${indicator.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${indicator.unit}`;
}

export function EconomicContextCard({ indicators }: { indicators: DashboardIndicator[] }) {
  const selected = fields.map(([code, label]) => ({
    code,
    label,
    indicator: indicators.find((item) => item.code === code),
  })).filter((item): item is typeof item & { indicator: AvailableIndicator } => item.indicator?.value !== null && item.indicator !== undefined);
  if (selected.length === 0) return null;
  const basePeriod = selected.map((item) => item.indicator?.baseDate).find(Boolean) ?? "기준시점 없음";
  return (
    <section className="indicator-area" aria-labelledby="economic-context-title">
      <div className="area-heading"><span>참고</span><h3 id="economic-context-title">참고 지역 경제 수준</h3></div>
      <p className="area-scope-notice">소득과 주거·상가 임대 수준은 지역 여건을 설명하는 참고정보이며 영역점수와 1~5등급에 반영하지 않습니다.</p>
      <article className="indicator-card economic-context-card">
        <div className="card-head"><div><div className="category">INFORMATION ONLY</div><h3>지역 경제 수준</h3></div><span className="badge badge-empty">점수 미반영</span></div>
        <div className="overview-grid economic-context-grid">
          {selected.map(({ code, label, indicator }) => {
            const mean = comparisonMean(indicator);
            return <dl className="definition" key={code}>
              <dt>{label}</dt>
              <dd>{valueLabel(indicator)}</dd>
              <small>비교지역 평균 {mean === null ? "산출 불가" : `${mean.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${indicator?.unit ?? ""}`}</small>
            </dl>;
          })}
        </div>
        <div className="source"><span>기준시점 {basePeriod}</span><span>서울시 상권분석서비스 행정동 자료</span></div>
      </article>
    </section>
  );
}
