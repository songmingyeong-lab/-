import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { quarterEndDate, recentQuarterCodes } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdSelngW";

const rowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(),
  ADSTRD_CD: z.coerce.string(),
  ADSTRD_CD_NM: z.string(),
  SVC_INDUTY_CD: z.coerce.string(),
  SVC_INDUTY_CD_NM: z.string(),
  THSMON_SELNG_AMT: z.coerce.number().nullable(),
});

export type EstimatedSalesRow = z.infer<typeof rowSchema>;

export function summarizeEstimatedSales(rows: EstimatedSalesRow[]) {
  return rows.reduce((sum, row) => sum + (row.THSMON_SELNG_AMT ?? 0), 0);
}

export const estimatedSalesAdapter: SourceAdapter = {
  code: "estimated-sales",
  cycle: "quarterly",
  async collect(context) {
    let data: Awaited<ReturnType<typeof fetchAllSeoulRows<EstimatedSalesRow>>> | null = null;
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
    if (rows.length === 0) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.payloads };
    const amount = summarizeEstimatedSales(rows);

    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - rows.length,
      indicators: [{
        code: "estimated_sales",
        name: "당월 추정매출",
        area: "상권 변화",
        value: amount,
        previousValue: null,
        unit: "원",
        baseDate: quarterEndDate(quarter),
        comparisonLabel: "전분기 대비",
        favorableDirection: "CONTEXT_DEPENDENT",
        status: "success",
        source: "서울시 상권분석서비스(추정매출-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do",
        geographicUnit: `${context.dongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "분기",
        statusMessage: `${quarter.slice(0, 4)}년 ${quarter.slice(4)}분기 업종별 당월 매출금액(THSMON_SELNG_AMT) 합계입니다. 서울시 상권분석 모형의 추정값이며 실제 전체 매출과 다를 수 있습니다.`,
        proxyDescription: "행정동 업종별 모형 추정매출 합계로, 실제 신고매출이나 주민소득을 뜻하지 않습니다.",
        series: [],
      }],
      rawPayloads: data.payloads,
    };
  },
};
