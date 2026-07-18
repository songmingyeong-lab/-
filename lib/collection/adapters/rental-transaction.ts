import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "tbLnOpendataRentV";

const rowSchema = z.object({
  RCPT_YR: z.coerce.string(),
  CGG_CD: z.coerce.string(),
  STDG_CD: z.coerce.string(),
  STDG_NM: z.string(),
  CTRT_DAY: z.coerce.string(),
  RENT_SE: z.string(),
  RTFE: z.coerce.number().nullable(),
});

export type RentalTransactionRow = z.infer<typeof rowSchema>;

export function summarizeMonthlyRent(rows: RentalTransactionRow[]) {
  const latestMonth = rows.reduce((latest, row) => {
    const month = row.CTRT_DAY.slice(0, 6);
    return row.RENT_SE === "월세" && (row.RTFE ?? 0) > 0 && month > latest ? month : latest;
  }, "");
  const monthRows = rows.filter((row) => row.RENT_SE === "월세" && (row.RTFE ?? 0) > 0 && row.CTRT_DAY.startsWith(latestMonth));
  const values = monthRows.map((row) => row.RTFE as number).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median = values.length === 0 ? null : values.length % 2 === 1 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  const latestContractDate = monthRows.reduce((latest, row) => row.CTRT_DAY > latest ? row.CTRT_DAY : latest, "");
  return { latestMonth, latestContractDate, sampleCount: values.length, median };
}

function displayDate(compact: string) {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

export const rentalTransactionAdapter: SourceAdapter = {
  code: "rental-transaction",
  cycle: "monthly",
  async collect(context) {
    const districtCode = context.legalDongCode.slice(0, 5);
    const legalDongCode = context.legalDongCode.slice(5);
    let data: Awaited<ReturnType<typeof fetchAllSeoulRows<RentalTransactionRow>>> | null = null;

    for (const year of [context.now.getUTCFullYear(), context.now.getUTCFullYear() - 1]) {
      const candidate = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [String(year), districtCode, " ", legalDongCode]);
      if (candidate.rows.length > 0) {
        data = candidate;
        break;
      }
    }

    if (!data) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [] };
    const rows = data.rows.filter((row) => row.CGG_CD === districtCode && row.STDG_CD === legalDongCode && row.STDG_NM === context.dongName);
    const summary = summarizeMonthlyRent(rows);
    if (summary.median === null) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.payloads };

    const insufficient = summary.sampleCount < 5;
    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - rows.length,
      indicators: [{
        code: "median_monthly_rent",
        name: "주거 월세 중위값",
        area: "상권 변화",
        value: summary.median,
        previousValue: null,
        unit: "만원",
        baseDate: displayDate(summary.latestContractDate),
        comparisonLabel: "전월 대비",
        favorableDirection: "CONTEXT_DEPENDENT",
        status: insufficient ? "insufficient_sample" : "success",
        source: "서울시 부동산 전월세가 정보",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-21276/S/1/datasetView.do",
        geographicUnit: `${context.districtName} ${context.dongName} 법정동`,
        collectedAt: context.now.toISOString(),
        updateCycle: "실시간",
        statusMessage: `${summary.latestMonth.slice(0, 4)}년 ${Number(summary.latestMonth.slice(4))}월 현재 공개된 월세 계약 ${summary.sampleCount}건의 임대료(RTFE) 중위값입니다.${insufficient ? " 표본이 5건 미만이므로 참고값입니다." : ""} 주거용 전월세 자료이며 상가 임대료가 아닙니다.`,
        proxyDescription: "가리봉동 주거용 월세 계약의 공개 표본을 나타내며 상가 임대료나 모든 임대주택의 시세를 뜻하지 않습니다.",
        series: [],
      }],
      rawPayloads: data.payloads,
    };
  },
};
