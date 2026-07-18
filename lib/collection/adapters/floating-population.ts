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
    const year = row.STDR_YYQU_CD.slice(0, 4);
    const quarter = Number(row.STDR_YYQU_CD.slice(4));
    const endMonth = String(quarter * 3).padStart(2, "0");
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: 1, recordsSkipped: data.rows.length - 1,
      indicators: [{
        code: "floating_population", name: "총 유동인구", area: "활력·혼잡", value: row.TOT_FLPOP_CO, previousValue: null, unit: "명",
        baseDate: `${year}-${endMonth}-${["03", "12"].includes(endMonth) ? "31" : "30"}`, comparisonLabel: "전분기 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success",
        source: "서울시 상권분석서비스(길단위인구-행정동)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: null,
        proxyDescription: "시간대별 지역 활동량의 대리 지표이며 실제 보행자 수와 동일하지 않습니다.", series: labels.map((date, index) => ({ date, value: values[index] })),
      }], rawPayloads: data.payloads,
    };
  },
};
