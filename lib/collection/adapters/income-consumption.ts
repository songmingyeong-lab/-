import type { SourceAdapter } from "@/lib/collection/types";

export const INCOME_UNAVAILABLE_REASON = "서울시 상권분석서비스의 월 평균 소득 데이터는 원자료 수급이 2020년에 중단되어 최신화가 불가능하며, 서울시는 2026년 5월 13일 해당 컬럼을 공식 API에서 삭제했습니다.";

export const incomeConsumptionAdapter: SourceAdapter = {
  code: "income-consumption",
  cycle: "quarterly",
  async collect(context) {
    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: 0,
      recordsSaved: 1,
      recordsSkipped: 0,
      indicators: [{
        code: "monthly_average_income",
        name: "월 평균 소득",
        area: "상권 변화",
        value: null,
        previousValue: null,
        unit: "원/월",
        baseDate: "2026-05-13",
        comparisonLabel: "동일 자치구 다른 행정동 평균",
        favorableDirection: "HIGHER_IS_BETTER",
        status: "restricted_data",
        source: "서울시 상권분석서비스(소비-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do",
        geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "제공 중단",
        statusMessage: INCOME_UNAVAILABLE_REASON,
        proxyDescription: "공식 행정동 소득 원자료가 삭제되어 원자료·비교평균·비교율·지표점수를 산출하지 않습니다. 결측값을 0이나 대체값으로 채우지 않습니다.",
        series: [],
      }],
    };
  },
};
