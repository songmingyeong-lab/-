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

function recentQuarterCodes(date: Date, count = 8) {
  const currentQuarterIndex = date.getUTCFullYear() * 4 + Math.floor(date.getUTCMonth() / 3);
  return Array.from({ length: count }, (_, offset) => {
    const quarterIndex = currentQuarterIndex - offset - 1;
    return `${Math.floor(quarterIndex / 4)}${(quarterIndex % 4) + 1}`;
  });
}

export const commercialStoreAdapter: SourceAdapter = {
  code: "commercial-store",
  cycle: "quarterly",
  async collect(context) {
    let data: Awaited<ReturnType<typeof fetchAllSeoulRows<z.infer<typeof rowSchema>>>> | null = null;
    let quarter = "";
    for (const candidateQuarter of recentQuarterCodes(context.now)) {
      const candidate = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [candidateQuarter]);
      if (candidate.rows.length > 0) {
        data = candidate;
        quarter = candidateQuarter;
        break;
      }
    }
    if (!data) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [] };
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
        code: "store_count", name: "전체 점포 수", area: "상권 변화", value: count, previousValue: null, unit: "개", baseDate: `${year}-${endMonth}-${endDay}`,
        comparisonLabel: "전분기 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success", source: "서울시 상권분석서비스(점포-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        collectedAt: context.now.toISOString(), updateCycle: "분기", statusMessage: null,
        proxyDescription: "업종별 전체 점포 수 합계이며 상권의 질이나 주민 만족도를 직접 뜻하지 않습니다.", series: [],
      }], rawPayloads: data.payloads,
    };
  },
};
