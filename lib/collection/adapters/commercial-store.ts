import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { quarterEndDate, recentQuarterCodes } from "@/lib/collection/quarter";
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
  OPBIZ_STOR_CO: z.coerce.number().nullable(),
  CLSBIZ_RT: z.coerce.number().nullable(),
  CLSBIZ_STOR_CO: z.coerce.number().nullable(),
});

export function summarizeCommercialStoreRows(rows: Array<z.infer<typeof rowSchema>>) {
  const storeCount = rows.reduce((sum, row) => sum + (row.SIMILR_INDUTY_STOR_CO ?? 0), 0);
  const openedCount = rows.reduce((sum, row) => sum + (row.OPBIZ_STOR_CO ?? 0), 0);
  const closedCount = rows.reduce((sum, row) => sum + (row.CLSBIZ_STOR_CO ?? 0), 0);
  return {
    storeCount,
    openedCount,
    closedCount,
    openingRate: storeCount > 0 ? (openedCount / storeCount) * 100 : null,
    closingRate: storeCount > 0 ? (closedCount / storeCount) * 100 : null,
  };
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
    const summary = summarizeCommercialStoreRows(rows);
    const baseDate = quarterEndDate(quarter);
    const common = {
      area: "상권 변화" as const,
      previousValue: null,
      baseDate,
      comparisonLabel: "전분기 대비",
      favorableDirection: "CONTEXT_DEPENDENT" as const,
      status: "success" as const,
      source: "서울시 상권분석서비스(점포-행정동)",
      sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do",
      geographicUnit: "가리봉동 행정동 전체",
      collectedAt: context.now.toISOString(),
      updateCycle: "분기",
      series: [],
    };
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: 3, recordsSkipped: data.rows.length - rows.length,
      indicators: [
        { ...common, code: "store_count", name: "전체 점포 수", value: summary.storeCount, unit: "개", statusMessage: null, proxyDescription: "업종별 전체 점포 수 합계이며 상권의 질이나 주민 만족도를 직접 뜻하지 않습니다." },
        { ...common, code: "opening_rate", name: "개업률", value: summary.openingRate, unit: "%", statusMessage: `공식 업종별 개업점포 수 ${summary.openedCount}개를 전체 점포 ${summary.storeCount}개로 나눈 가중 집계값입니다.`, proxyDescription: "업종별 공식 개업률을 단순평균하지 않고 개업점포 수와 전체 점포 수로 집계한 상권 진입 보조지표입니다." },
        { ...common, code: "closing_rate", name: "폐업률", value: summary.closingRate, unit: "%", statusMessage: `공식 업종별 폐업점포 수 ${summary.closedCount}개를 전체 점포 ${summary.storeCount}개로 나눈 가중 집계값입니다.`, proxyDescription: "업종별 공식 폐업률을 단순평균하지 않고 폐업점포 수와 전체 점포 수로 집계한 상권 이탈 보조지표입니다." },
      ],
      rawPayloads: data.payloads,
    };
  },
};
