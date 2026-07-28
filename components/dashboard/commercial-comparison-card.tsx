import type { DashboardIndicator } from "@/lib/indicators/types";
import type { ComparisonAvailability } from "@/lib/scoring/types";

function rateLabel(value: number | null) {
  if (value === null) return "비교 자료 미수집";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function valueLabel(value: number | null, unit: string) {
  return value === null ? "자료 없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${unit}`;
}

export function CommercialComparisonCard({
  availability,
  storeIndicator,
}: {
  availability: ComparisonAvailability;
  storeIndicator?: DashboardIndicator;
}) {
  const badge = availability.quality === "normal" ? "정상 비교" : availability.quality === "low" ? "제한적 비교" : "비교 불가";
  const badgeClass = availability.quality === "normal" ? "badge-success" : "badge-empty";
  return (
    <article className="indicator-card" aria-labelledby="commercial-comparison-title">
      <div className="card-head">
        <div><div className="category">상권 비교 가용성</div><h3 id="commercial-comparison-title">상권 기반 참고점수</h3></div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      {availability.available ? (
        <>
          <div className="metric"><strong>{availability.referenceScore?.toFixed(1)}</strong><span>/ 5.0</span></div>
          <p className="score-interpretation">{availability.message}</p>
          {availability.quality === "low" && <p className="status-message"><strong>비교 행정동 수가 적어 참고용으로만 해석</strong></p>}
          <dl className="score-comparison-grid">
            <div><dt>점포 수 규모 백분위</dt><dd>{availability.percentileRank?.toFixed(1) ?? "산출 불가"}%</dd></div>
            <div><dt>비교 행정동 수</dt><dd><strong>{availability.usableDongCount}개</strong><small>{availability.scopeLabel}</small></dd></div>
            <div><dt>수집된 행정동</dt><dd>{availability.collectedDongCount}개</dd></div>
            <div><dt>자치구 비교평균</dt><dd>{valueLabel(availability.comparisonMean, storeIndicator?.unit ?? "개")}</dd></div>
            <div><dt>자치구 비교중앙값</dt><dd>{valueLabel(availability.comparisonMedian, storeIndicator?.unit ?? "개")}</dd></div>
            <div><dt>기준분기</dt><dd>{availability.basePeriod ?? "자료 없음"}</dd></div>
          </dl>
          <p className="context-score-notice">점포 수 규모의 상대적 위치를 5구간으로 표시한 참고점수이며, 높고 낮음 자체를 도시재생 성과나 상권의 우열로 해석하지 않습니다.</p>
        </>
      ) : (
        <p className="status-message data-gap-reason"><strong>같은 자치구 내 비교 가능한 행정동 데이터가 부족해 상대점수를 산정하지 않았습니다.</strong></p>
      )}
      <dl className="score-comparison-grid">
        <div><dt>점포 수</dt><dd>{valueLabel(storeIndicator?.value ?? null, storeIndicator?.unit ?? "개")}</dd></div>
        <div><dt>점포 증감률</dt><dd>{rateLabel(availability.previousQuarterChangeRate)}<small>직전 분기 대비</small></dd></div>
        <div><dt>전년 동분기 대비 변화</dt><dd>{rateLabel(availability.yearOverYearChangeRate)}</dd></div>
        <div><dt>최근 4개 분기 평균 대비</dt><dd>{rateLabel(availability.recentFourQuarterChangeRate)}</dd></div>
        <div><dt>최근 추세</dt><dd>{storeIndicator?.series.length ? `${storeIndicator.series.length}개 분기 수집` : "자료 미수집"}</dd></div>
      </dl>
      {availability.quality === "insufficient" && <p className="proxy">같은 자치구의 비교 데이터가 부족해 점수를 산정하지 않았습니다.</p>}
    </article>
  );
}
