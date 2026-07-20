import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { quarterEndDate, recentQuarterCodes } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdSelngW";
const storeService = "VwsmAdstrdStorW";

const rowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(),
  ADSTRD_CD: z.coerce.string(),
  ADSTRD_CD_NM: z.string(),
  SVC_INDUTY_CD: z.coerce.string(),
  SVC_INDUTY_CD_NM: z.string(),
  THSMON_SELNG_AMT: z.coerce.number().nullable(),
});

export type EstimatedSalesRow = z.infer<typeof rowSchema>;

const storeRowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(),
  ADSTRD_CD: z.coerce.string(),
  ADSTRD_CD_NM: z.string(),
  SIMILR_INDUTY_STOR_CO: z.coerce.number().nullable(),
});

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
    const storeData = await fetchAllSeoulRows(context.apiKey, storeService, storeRowSchema, [quarter]);
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const salesByDong = new Map<string, { name: string; amount: number }>();
    for (const row of data.rows.filter((item) => item.ADSTRD_CD.startsWith(districtCode))) {
      const current = salesByDong.get(row.ADSTRD_CD) ?? { name: row.ADSTRD_CD_NM, amount: 0 };
      current.amount += row.THSMON_SELNG_AMT ?? 0;
      salesByDong.set(row.ADSTRD_CD, current);
    }
    const storesByDong = new Map<string, number>();
    for (const row of storeData.rows.filter((item) => item.ADSTRD_CD.startsWith(districtCode))) {
      storesByDong.set(row.ADSTRD_CD, (storesByDong.get(row.ADSTRD_CD) ?? 0) + (row.SIMILR_INDUTY_STOR_CO ?? 0));
    }
    const perStoreValues = [...salesByDong.entries()].map(([code, item]) => {
      const storeCount = storesByDong.get(code) ?? 0;
      return { code, name: item.name, value: storeCount > 0 ? item.amount / storeCount : null };
    });
    const targetPerStore = perStoreValues.find((item) => item.code === context.administrativeDongCode)?.value ?? null;
    if (targetPerStore === null) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length + storeData.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length + storeData.rows.length, indicators: [], rawPayloads: [...data.payloads, ...storeData.payloads] };
    const spatialComparison = {
      target: { areaCode: context.administrativeDongCode, areaName: context.dongName, cityCode: context.administrativeDongCode.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: quarter, unit: "원/점포", value: targetPerStore },
      candidates: perStoreValues.filter((item) => item.code !== context.administrativeDongCode).map((item) => ({ areaCode: item.code, areaName: item.name, cityCode: item.code.slice(0, 2), districtCode: item.code.slice(0, 5), geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: quarter, unit: "원/점포", value: item.value })),
    };

    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - rows.length,
      indicators: [{
        code: "estimated_sales",
        name: "점포당 추정매출",
        area: "상권 변화",
        value: targetPerStore,
        previousValue: null,
        unit: "원/점포",
        baseDate: quarterEndDate(quarter),
        comparisonLabel: "전분기 대비",
        favorableDirection: "CONTEXT_DEPENDENT",
        status: "success",
        source: "서울시 상권분석서비스(추정매출-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22175/S/1/datasetView.do",
        geographicUnit: `${context.dongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "분기",
        statusMessage: `${quarter.slice(0, 4)}년 ${quarter.slice(4)}분기 업종별 당월 추정매출 ${amount.toLocaleString("ko-KR")}원을 같은 분기 전체 점포 수로 나눈 값입니다.`,
        proxyDescription: "서울시 상권분석 모형의 점포당 추정매출이며 실제 신고매출이나 주민소득을 뜻하지 않습니다.",
        series: [],
        spatialComparison,
      }],
      rawPayloads: [...data.payloads, ...storeData.payloads],
    };
  },
};
