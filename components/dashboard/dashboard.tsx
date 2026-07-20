import { IndicatorCard } from "@/components/indicators/indicator-card";
import { CategoryScoreSummary } from "@/components/scores/category-score-summary";
import { INDICATOR_AREA_ORDER } from "@/lib/indicators/types";
import type { DashboardData, DataStatus } from "@/lib/indicators/types";

const statusLabels: Record<DataStatus, string> = {
  loading: "불러오는 중", success: "수집 완료", empty: "자료 없음", stale: "갱신 필요", error: "수집 실패", mock: "공식자료 확인값", partial_success: "일부 수집",
  unsupported_geography: "지역 단위 미지원", insufficient_sample: "표본 불충분", unverified: "검증 필요", manual_verification_required: "수동 검증 필요", restricted_data: "제한 데이터",
};

function formatCollectedAt(value: string | null) {
  if (!value) return "수집 기록 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}

export function Dashboard({ data }: { data: DashboardData }) {
  const availableCount = data.indicators.filter((indicator) => indicator.value !== null).length;
  const pendingCount = data.indicators.length - availableCount;
  const usesSnapshot = data.indicators.some((indicator) => indicator.status === "mock");
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div><p className="eyebrow">GARIBONG URBAN REGENERATION</p><h1>가리봉동 도시재생 주민체감 보조지표</h1><p className="subtitle">대상 지역: 서울특별시 구로구 가리봉동 · 행정동 전체</p></div>
          <div className="status-panel" aria-label="데이터 수집 상태">
            <div className="status-line"><span>데이터 모드</span><strong>{data.mode === "mock" ? "공식자료 확인 스냅샷" : usesSnapshot ? "실시간 수집 + 확인 스냅샷" : "실시간 수집 데이터"}</strong></div>
            <div className="status-line"><span>마지막 수집</span><strong>{formatCollectedAt(data.lastCollectedAt)}</strong></div>
            <div className="status-line"><span>전체 상태</span><strong>{statusLabels[data.status]}</strong></div>
          </div>
        </div>
      </header>
      <div className="content">
        <div className="notice"><span className="badge badge-mock">공공데이터 기반 주민체감 보조지표 Proxy</span><span>확인값 {availableCount}개 · 확인 필요 {pendingCount}개. 값이 없는 자료는 0으로 대체하지 않습니다. 주민 설문·현장조사와 함께 해석해야 합니다.</span></div>
        <section className="overview" aria-labelledby="overview-title">
          <div>
            <p className="section-kicker">지역 개요</p><h2 id="overview-title">{data.area.name}</h2>
            <div className="overview-grid" style={{ marginTop: 20 }}>
              <dl className="definition"><dt>도시재생 사업</dt><dd>{data.area.projectName}</dd></dl>
              <dl className="definition"><dt>사업유형</dt><dd>{data.area.projectType}</dd></dl>
              <dl className="definition"><dt>지표 공간범위</dt><dd>{data.area.scope}</dd></dl>
              <dl className="definition"><dt>지역 코드</dt><dd>행정동 {data.area.administrativeDongCode ?? "확인 필요"} · 법정동 {data.area.legalDongCode ?? "확인 필요"}</dd></dl>
            </div>
          </div>
          <div className="location-box"><div><strong>서울 서남권 · 구로구 가리봉동</strong><br /><small>행정동 전체 지표이며 과거 도시재생활성화구역 경계와 동일하지 않습니다.</small></div></div>
        </section>
        <section aria-labelledby="indicators-title">
          <div className="section-heading"><div><h2 id="indicators-title">영역별 보조지표와 공간비교 점수</h2><p>같은 원천·기준기간·단위의 공간 비교율을 영역 안에서만 가중평균하며, 다섯 영역을 합친 종합점수는 만들지 않습니다.</p></div>{data.mode === "mock" && <span className="badge badge-mock">2026-07-18 확인 스냅샷</span>}</div>
          {INDICATOR_AREA_ORDER.map((area, index) => {
            const indicators = data.indicators.filter((indicator) => indicator.area === area);
            const categoryScore = data.categoryScores.find((result) => result.category === area);
            return <section className="indicator-area" aria-labelledby={`area-${index}`} key={area}>
              <div className="area-heading"><span>{index + 1}</span><h3 id={`area-${index}`}>{area}</h3></div>
              {area === "생활 불편" && <p className="area-scope-notice">도로공사는 동 명칭 기반 대체비교, 민원은 구로구 단위 임시점수를 사용합니다. 엄격 비교가 아닌 점수에는 산출 주의를 표시합니다.</p>}
              {area === "공동체·거점" && <p className="area-scope-notice">프로그램은 구로구와 서울시 다른 자치구의 공개예약 총수를, 거점시설은 구로구 법정동별 동일 용도분류 수를 대체 비교합니다.</p>}
              {categoryScore && <CategoryScoreSummary result={categoryScore} />}
              {indicators.length > 0 ? <div className="card-grid">{indicators.map((indicator) => <IndicatorCard key={indicator.code} indicator={indicator} score={categoryScore?.indicatorScores.find((result) => result.indicatorCode === indicator.code)} />)}</div> : <div className="area-empty">연결된 지표가 없습니다. 공식 자료원과 공간단위를 확인 중입니다.</div>}
            </section>;
          })}
        </section>
        <section className="methodology" aria-labelledby="methodology-title">
          <h2 id="methodology-title">데이터 출처·해석 안내</h2>
          <p><strong>점수 방법론:</strong> {data.scoringNotice} 산정 버전은 {data.scoringVersion}입니다.</p>
          <p>본 지표는 주민 만족도를 직접 측정한 값이 아니라, 공공데이터를 기반으로 가리봉동의 주거환경, 생활 불편, 상권 변화, 지역활력, 공동체 활동과 거점시설 상태를 보조적으로 확인하기 위한 Proxy입니다. 공식 도시재생 성과평가와 주민 설문 결과를 함께 고려해야 합니다.</p>
          <p>결측 자료는 0으로 바꾸거나 임의 보간하지 않습니다. 값의 증가는 항상 긍정적인 의미가 아니며, 카드별 방향성과 공간범위를 확인해야 합니다.</p>
        </section>
      </div>
    </main>
  );
}
