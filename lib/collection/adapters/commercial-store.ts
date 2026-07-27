import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { residentPopulationRowSchema, selectLatestResidentPopulationRows, type ResidentPopulationRow } from "@/lib/collection/adapters/resident-population";
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
  const officialOpeningWeight = rows.reduce((sum, row) => sum + (row.OPBIZ_RT === null ? 0 : row.SIMILR_INDUTY_STOR_CO ?? 0), 0);
  const officialClosingWeight = rows.reduce((sum, row) => sum + (row.CLSBIZ_RT === null ? 0 : row.SIMILR_INDUTY_STOR_CO ?? 0), 0);
  const officialOpeningRate = officialOpeningWeight > 0
    ? rows.reduce((sum, row) => sum + (row.OPBIZ_RT ?? 0) * (row.SIMILR_INDUTY_STOR_CO ?? 0), 0) / officialOpeningWeight
    : null;
  const officialClosingRate = officialClosingWeight > 0
    ? rows.reduce((sum, row) => sum + (row.CLSBIZ_RT ?? 0) * (row.SIMILR_INDUTY_STOR_CO ?? 0), 0) / officialClosingWeight
    : null;
  return {
    storeCount,
    openedCount,
    closedCount,
    openingRate: officialOpeningRate ?? (storeCount > 0 ? (openedCount / storeCount) * 100 : null),
    closingRate: officialClosingRate ?? (storeCount > 0 ? (closedCount / storeCount) * 100 : null),
    openingRateSource: officialOpeningRate === null ? "CALCULATED_FALLBACK" as const : "OFFICIAL_WEIGHTED" as const,
    closingRateSource: officialClosingRate === null ? "CALCULATED_FALLBACK" as const : "OFFICIAL_WEIGHTED" as const,
  };
}

export function storesPer1000Households(storeCount: number, householdCount: number | null) {
  return householdCount && householdCount > 0 ? (storeCount / householdCount) * 1_000 : null;
}

export const commercialStoreAdapter: SourceAdapter = {
  code: "commercial-store",
  cycle: "quarterly",
  async collect(context) {
    let data: Awaited<ReturnType<typeof fetchAllSeoulRows<z.infer<typeof rowSchema>>>> | null = null;
    let previousData: Awaited<ReturnType<typeof fetchAllSeoulRows<z.infer<typeof rowSchema>>>> | null = null;
    let quarter = "";
    let previousQuarter = "";
    for (const candidateQuarter of recentQuarterCodes(context.now)) {
      const candidate = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [candidateQuarter]);
      if (candidate.rows.length > 0) {
        if (!data) {
          data = candidate;
          quarter = candidateQuarter;
        } else {
          previousData = candidate;
          previousQuarter = candidateQuarter;
          break;
        }
      }
    }
    if (!data) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [] };
    const rows = data.rows.filter((row) => row.ADSTRD_CD === context.administrativeDongCode && row.ADSTRD_CD_NM === context.administrativeDongName);
    if (rows.length === 0) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [] };
    const summary = summarizeCommercialStoreRows(rows);
    const previousRows = previousData?.rows.filter((row) => row.ADSTRD_CD === context.administrativeDongCode && row.ADSTRD_CD_NM === context.administrativeDongName) ?? [];
    const previousSummary = previousRows.length ? summarizeCommercialStoreRows(previousRows) : null;
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const residentData = await fetchAllSeoulRows<ResidentPopulationRow>(context.apiKey, "VwsmAdstrdRepopW", residentPopulationRowSchema);
    const latestResidents = selectLatestResidentPopulationRows(residentData.rows);
    const sameQuarterResidents = residentData.rows.filter((row) => row.STDR_YYQU_CD === quarter);
    const previousQuarterResidents = residentData.rows.filter((row) => row.STDR_YYQU_CD === previousQuarter);
    const householdByDong = new Map(sameQuarterResidents.map((row) => [row.ADSTRD_CD, row.TOT_HSHLD_CO]));
    const previousHouseholdByDong = new Map(previousQuarterResidents.map((row) => [row.ADSTRD_CD, row.TOT_HSHLD_CO]));
    const grouped = new Map<string, typeof rows>();
    for (const row of data.rows.filter((item) => item.ADSTRD_CD.startsWith(districtCode))) {
      grouped.set(row.ADSTRD_CD, [...(grouped.get(row.ADSTRD_CD) ?? []), row]);
    }
    const summaries = [...grouped.entries()].map(([code, dongRows]) => {
      const storeSummary = summarizeCommercialStoreRows(dongRows);
      const householdCount = householdByDong.get(code) ?? null;
      return { code, name: dongRows[0].ADSTRD_CD_NM, householdCount, storeDensity: storesPer1000Households(storeSummary.storeCount, householdCount), ...storeSummary };
    });
    const targetSummary = summaries.find((item) => item.code === context.administrativeDongCode)!;
    const previousStoreDensity = previousSummary
      ? storesPer1000Households(previousSummary.storeCount, previousHouseholdByDong.get(context.administrativeDongCode) ?? null)
      : null;
    const comparisonData = (unit: string, select: (item: (typeof summaries)[number]) => number | null) => ({
      target: { areaCode: context.administrativeDongCode, areaName: context.administrativeDongName, cityCode: context.administrativeDongCode.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: quarter, unit, value: select(targetSummary) },
      candidates: summaries.filter((item) => item.code !== context.administrativeDongCode).map((item) => ({ areaCode: item.code, areaName: item.name, cityCode: item.code.slice(0, 2), districtCode: item.code.slice(0, 5), geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: quarter, unit, value: select(item) })),
    });
    const baseDate = quarterEndDate(quarter);
    const common = {
      area: "상권 변화" as const,
      previousValue: null,
      baseDate,
      comparisonLabel: "동일 자치구 다른 행정동 평균",
      favorableDirection: "CONTEXT_DEPENDENT" as const,
      status: "success" as const,
      source: "서울시 상권분석서비스(점포-행정동)",
      sourceUrl: "https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do",
      geographicUnit: `${context.administrativeDongName} 행정동 전체`,
      collectedAt: context.now.toISOString(),
      updateCycle: "분기",
      series: [],
    };
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length + (previousData?.rows.length ?? 0) + residentData.rows.length, recordsSaved: 2, recordsSkipped: data.rows.length - rows.length,
      indicators: [
        { ...common, code: "store_density", name: "1,000가구당 점포 수", value: targetSummary.storeDensity, previousValue: previousStoreDensity, unit: "개/1,000가구", status: targetSummary.storeDensity === null ? "empty" as const : "success" as const, statusMessage: targetSummary.storeDensity === null ? `행정동 면적을 자동 수집하지 못했고 점포 기준분기(${quarter})와 같은 가구 수도 없어 대체 밀도를 계산할 수 없습니다. 가구 자료 최신분기는 ${latestResidents.quarter || "없음"}입니다.` : "행정동 면적·분석대상 도로길이를 실시간 API에서 확보하지 못해 점포 수를 같은 기준분기의 가구 수로 나눈 1,000가구당 점포 수를 적용했습니다.", proxyDescription: "지역 면적 대신 가구 수로 정규화한 점포 분포 대체지표이며 물리적 면적 밀도와 동일하지 않습니다.", spatialComparison: comparisonData("개/1,000가구", (item) => item.storeDensity) },
        { ...common, code: "store_count", name: "점포 수", value: summary.storeCount, previousValue: previousSummary?.storeCount ?? null, unit: "개", statusMessage: "서울시 정의에 따라 당기 운영 점포 수와 당기 폐업 점포 수를 포함한 전체 점포 수입니다.", proxyDescription: "점수에 직접 반영하지 않는 원자료이며 상권의 질이나 주민 만족도를 직접 뜻하지 않습니다.", series: rows.sort((a, b) => (b.SIMILR_INDUTY_STOR_CO ?? 0) - (a.SIMILR_INDUTY_STOR_CO ?? 0)).slice(0, 12).map((row) => ({ date: row.SVC_INDUTY_CD_NM, value: row.SIMILR_INDUTY_STOR_CO })), spatialComparison: comparisonData("개", (item) => item.storeCount) },
      ],
      rawPayloads: [...data.payloads, ...(previousData?.payloads ?? []), ...residentData.payloads],
    };
  },
};
