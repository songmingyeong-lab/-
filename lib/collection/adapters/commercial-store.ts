import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdStorW";
const rowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(),
  ADSTRD_CD: z.coerce.string(),
  ADSTRD_CD_NM: z.string(),
  SVC_INDUTY_CD: z.coerce.string(),
  SVC_INDUTY_CD_NM: z.string(),
  SIMILR_INDUTY_STOR_CO: z.coerce.number().nullable(),
  OPBIZ_RT: z.coerce.number().nullable(),
  CLSBIZ_RT: z.coerce.number().nullable(),
});

function previousQuarter(date: Date) {
  const month = date.getUTCMonth();
  const currentQuarter = Math.floor(month / 3) + 1;
  const year = currentQuarter === 1 ? date.getUTCFullYear() - 1 : date.getUTCFullYear();
  const quarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  return `${year}${quarter}`;
}

export const commercialStoreAdapter: SourceAdapter = {
  code: "commercial-store",
  cycle: "quarterly",
  async collect(context) {
    const quarter = previousQuarter(context.now);
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [quarter]);
    const rows = data.rows.filter((row) => row.ADSTRD_CD === context.administrativeDongCode && row.ADSTRD_CD_NM === context.dongName);
    if (rows.length === 0) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [] };
    const count = rows.reduce((sum, row) => sum + (row.SIMILR_INDUTY_STOR_CO ?? 0), 0);
    const year = quarter.slice(0, 4);
    const quarterNumber = Number(quarter.slice(4));
    const endMonth = String(quarterNumber * 3).padStart(2, "0");
    const endDay = ["03", "12"].includes(endMonth) ? "31" : "30";
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: 1, recordsSkipped: data.rows.length - rows.length,
      indicators: [{
        code: "store_count", name: "전체 점포 수", category: "상권 변화", value: count, previousValue: null, unit: "개", baseDate: `${year}-${endMonth}-${endDay}`,
        comparisonLabel: "전분기 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success", source: "서울시 상권분석서비스(점포-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        proxyDescription: "업종별 전체 점포 수 합계이며 상권의 질이나 주민 만족도를 직접 뜻하지 않습니다.", series: [],
      }], rawPayloads: data.payloads,
    };
  },
};
