import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdFlpopW";
const rowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(), ADSTRD_CD: z.coerce.string(), ADSTRD_CD_NM: z.string(), TOT_FLPOP_CO: z.coerce.number().nullable(),
  TMZON_00_06_FLPOP_CO: z.coerce.number().nullable(), TMZON_06_11_FLPOP_CO: z.coerce.number().nullable(), TMZON_11_14_FLPOP_CO: z.coerce.number().nullable(),
  TMZON_14_17_FLPOP_CO: z.coerce.number().nullable(), TMZON_17_21_FLPOP_CO: z.coerce.number().nullable(), TMZON_21_24_FLPOP_CO: z.coerce.number().nullable(),
  MON_FLPOP_CO: z.coerce.number().nullable(), TUES_FLPOP_CO: z.coerce.number().nullable(), WED_FLPOP_CO: z.coerce.number().nullable(),
  THUR_FLPOP_CO: z.coerce.number().nullable(), FRI_FLPOP_CO: z.coerce.number().nullable(), SAT_FLPOP_CO: z.coerce.number().nullable(), SUN_FLPOP_CO: z.coerce.number().nullable(),
});

type FloatingPopulationRow = z.infer<typeof rowSchema>;

function timeValues(row: FloatingPopulationRow) {
  return [
    row.TMZON_00_06_FLPOP_CO, row.TMZON_06_11_FLPOP_CO, row.TMZON_11_14_FLPOP_CO,
    row.TMZON_14_17_FLPOP_CO, row.TMZON_17_21_FLPOP_CO, row.TMZON_21_24_FLPOP_CO,
  ];
}

export function floatingPopulationConcentration(row: FloatingPopulationRow) {
  const values = timeValues(row).filter((value): value is number => value !== null);
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 && values.length > 0 ? (Math.max(...values) / total) * 100 : null;
}

export const floatingPopulationAdapter: SourceAdapter = {
  code: "floating-population", cycle: "quarterly",
  async collect(context) {
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema);
    const targetRows = data.rows
      .filter((item) => item.ADSTRD_CD === context.administrativeDongCode && item.ADSTRD_CD_NM === context.administrativeDongName)
      .sort((a, b) => b.STDR_YYQU_CD.localeCompare(a.STDR_YYQU_CD));
    const row = targetRows[0];
    const previousRow = targetRows[1];
    if (!row) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [] };
    const labels = ["00~06", "06~11", "11~14", "14~17", "17~21", "21~24"];
    const values = timeValues(row);
    const concentration = floatingPopulationConcentration(row);
    const previousConcentration = previousRow ? floatingPopulationConcentration(previousRow) : null;
    const peak = values.reduce<{ label: string; value: number } | null>((current, value, index) => {
      if (value === null || (current && current.value >= value)) return current;
      return { label: labels[index], value };
    }, null);
    const year = row.STDR_YYQU_CD.slice(0, 4);
    const quarter = Number(row.STDR_YYQU_CD.slice(4));
    const endMonth = String(quarter * 3).padStart(2, "0");
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const comparisonRows = data.rows.filter((item) => item.STDR_YYQU_CD === row.STDR_YYQU_CD && item.ADSTRD_CD.startsWith(districtCode));
    const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];
    const weekdayValues = [row.MON_FLPOP_CO, row.TUES_FLPOP_CO, row.WED_FLPOP_CO, row.THUR_FLPOP_CO, row.FRI_FLPOP_CO, row.SAT_FLPOP_CO, row.SUN_FLPOP_CO];
    const comparisonData = (unit: string, select: (item: z.infer<typeof rowSchema>) => number | null) => ({
      target: { areaCode: row.ADSTRD_CD, areaName: row.ADSTRD_CD_NM, cityCode: row.ADSTRD_CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: row.STDR_YYQU_CD, unit, value: select(row) },
      candidates: comparisonRows.filter((item) => item.ADSTRD_CD !== row.ADSTRD_CD).map((item) => ({ areaCode: item.ADSTRD_CD, areaName: item.ADSTRD_CD_NM, cityCode: item.ADSTRD_CD.slice(0, 2), districtCode: item.ADSTRD_CD.slice(0, 5), geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: item.STDR_YYQU_CD, unit, value: select(item) })),
    });
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: 4, recordsSkipped: data.rows.length - 1,
      indicators: [{
        code: "street_floating_population_density", name: "길 단위 유동인구 밀도", area: "활력·혼잡", value: row.TOT_FLPOP_CO, previousValue: previousRow?.TOT_FLPOP_CO ?? null, unit: "명(합계 대체)",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "동일 자치구 다른 행정동 평균", favorableDirection: "CONTEXT_DEPENDENT", status: "success",
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: "분석대상 도로 총길이·행정동 면적을 현재 자동 수집 경로에서 확보하지 못해 우선순위 4인 전체 길 단위 유동인구 합계를 점수 대체값으로 사용합니다.",
        proxyDescription: "정규화 분모가 없는 합계 대체점수로 지역 크기의 영향을 받을 수 있으며 실제 보행자 수와 동일하지 않습니다.", series: labels.map((date, index) => ({ date, value: values[index] })), spatialComparison: comparisonData("명(합계 대체)", (item) => item.TOT_FLPOP_CO),
      }, {
        code: "floating_population_concentration", name: "시간대별 유동인구 집중도", area: "활력·혼잡" as const, value: concentration, previousValue: previousConcentration, unit: "%",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "동일 자치구 다른 행정동 평균", favorableDirection: "CONTEXT_DEPENDENT" as const, status: concentration === null ? "empty" as const : "success" as const,
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: peak && concentration !== null ? `가장 큰 ${peak.label} 시간대 유동인구를 6개 시간대 합계로 나눈 집중도입니다.` : "시간대 값이 없어 집중도를 계산할 수 없습니다.",
        proxyDescription: "하나의 최대 시간대가 전체 시간대 유동인구에서 차지하는 비중이며 체감 혼잡도를 직접 뜻하지 않습니다.", series: labels.map((date, index) => ({ date, value: values[index] })), spatialComparison: comparisonData("%", floatingPopulationConcentration),
      }, {
        code: "street_floating_population_total", name: "길 단위 유동인구 합계", area: "활력·혼잡" as const, value: row.TOT_FLPOP_CO, previousValue: previousRow?.TOT_FLPOP_CO ?? null, unit: "명",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "동일 자치구 다른 행정동 평균", favorableDirection: "NEUTRAL" as const, status: "success" as const,
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: "점수에는 직접 반영하지 않는 길 단위 유동인구 원자료 합계입니다.",
        proxyDescription: "10m 길이 단위로 생성된 유동인구의 행정동 합계이며 지역 크기의 영향을 받습니다.", series: labels.map((date, index) => ({ date, value: values[index] })), spatialComparison: comparisonData("명", (item) => item.TOT_FLPOP_CO),
      }, {
        code: "floating_population_by_weekday", name: "요일별 길 단위 유동인구", area: "활력·혼잡" as const, value: row.TOT_FLPOP_CO, previousValue: null, unit: "명",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "차트 정보", favorableDirection: "NEUTRAL" as const, status: "success" as const,
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: "요일별 값은 차트용 참고정보이며 점수에 반영하지 않습니다.",
        proxyDescription: "요일별 길 단위 유동인구 분포를 보여주는 참고자료입니다.", series: weekdayLabels.map((date, index) => ({ date, value: weekdayValues[index] })),
      }], rawPayloads: data.payloads,
    };
  },
};
