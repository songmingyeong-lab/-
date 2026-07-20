import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdFlpopW";
const rowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(), ADSTRD_CD: z.coerce.string(), ADSTRD_CD_NM: z.string(), TOT_FLPOP_CO: z.coerce.number().nullable(),
  TMZON_00_06_FLPOP_CO: z.coerce.number().nullable(), TMZON_06_11_FLPOP_CO: z.coerce.number().nullable(), TMZON_11_14_FLPOP_CO: z.coerce.number().nullable(),
  TMZON_14_17_FLPOP_CO: z.coerce.number().nullable(), TMZON_17_21_FLPOP_CO: z.coerce.number().nullable(), TMZON_21_24_FLPOP_CO: z.coerce.number().nullable(),
});

export const floatingPopulationAdapter: SourceAdapter = {
  code: "floating-population", cycle: "quarterly",
  async collect(context) {
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema);
    const row = data.rows
      .filter((item) => item.ADSTRD_CD === context.administrativeDongCode && item.ADSTRD_CD_NM === context.dongName)
      .sort((a, b) => b.STDR_YYQU_CD.localeCompare(a.STDR_YYQU_CD))[0];
    if (!row) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [] };
    const labels = ["00~06", "06~11", "11~14", "14~17", "17~21", "21~24"];
    const values = [row.TMZON_00_06_FLPOP_CO, row.TMZON_06_11_FLPOP_CO, row.TMZON_11_14_FLPOP_CO, row.TMZON_14_17_FLPOP_CO, row.TMZON_17_21_FLPOP_CO, row.TMZON_21_24_FLPOP_CO];
    const peak = values.reduce<{ label: string; value: number } | null>((current, value, index) => {
      if (value === null || (current && current.value >= value)) return current;
      return { label: labels[index], value };
    }, null);
    const year = row.STDR_YYQU_CD.slice(0, 4);
    const quarter = Number(row.STDR_YYQU_CD.slice(4));
    const endMonth = String(quarter * 3).padStart(2, "0");
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const comparisonRows = data.rows.filter((item) => item.STDR_YYQU_CD === row.STDR_YYQU_CD && item.ADSTRD_CD.startsWith(districtCode));
    const peakValue = (item: z.infer<typeof rowSchema>) => Math.max(...[
      item.TMZON_00_06_FLPOP_CO, item.TMZON_06_11_FLPOP_CO, item.TMZON_11_14_FLPOP_CO,
      item.TMZON_14_17_FLPOP_CO, item.TMZON_17_21_FLPOP_CO, item.TMZON_21_24_FLPOP_CO,
    ].filter((value): value is number => value !== null));
    const comparisonData = (unit: string, select: (item: z.infer<typeof rowSchema>) => number | null) => ({
      target: { areaCode: row.ADSTRD_CD, areaName: row.ADSTRD_CD_NM, cityCode: row.ADSTRD_CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: row.STDR_YYQU_CD, unit, value: select(row) },
      candidates: comparisonRows.filter((item) => item.ADSTRD_CD !== row.ADSTRD_CD).map((item) => ({ areaCode: item.ADSTRD_CD, areaName: item.ADSTRD_CD_NM, cityCode: item.ADSTRD_CD.slice(0, 2), districtCode: item.ADSTRD_CD.slice(0, 5), geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: item.STDR_YYQU_CD, unit, value: select(item) })),
    });
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: peak ? 2 : 1, recordsSkipped: data.rows.length - 1,
      indicators: [{
        code: "floating_population", name: "총 유동인구", area: "활력·혼잡", value: row.TOT_FLPOP_CO, previousValue: null, unit: "명",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "전분기 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success",
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: null,
        proxyDescription: "시간대별 지역 활동량의 대리 지표이며 실제 보행자 수와 동일하지 않습니다.", series: labels.map((date, index) => ({ date, value: values[index] })), spatialComparison: comparisonData("명", (item) => item.TOT_FLPOP_CO),
      }, ...(peak ? [{
        code: "peak_floating_time_band", name: "최대 집중 시간대 유동인구", area: "활력·혼잡" as const, value: peak.value, previousValue: null, unit: "명",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "전분기 대비", favorableDirection: "NEUTRAL" as const, status: "success" as const,
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: `6개 시간대 중 ${peak.label} 구간이 ${peak.value.toLocaleString("ko-KR")}명으로 가장 큽니다. 혼잡도가 아니라 유동인구 집중 시간대입니다.`,
        proxyDescription: "시간대별 유동인구 집중을 나타내며 면적 기준 혼잡도나 체감 혼잡도를 직접 뜻하지 않습니다.", series: labels.map((date, index) => ({ date, value: values[index] })), spatialComparison: comparisonData("명", peakValue),
      }] : [])], rawPayloads: data.payloads,
    };
  },
};
