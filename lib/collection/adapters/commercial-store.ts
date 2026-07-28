import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { fetchGolmokConditionRows } from "@/lib/api/golmok-client";
import { residentPopulationRowSchema, selectLatestResidentPopulationRows, type ResidentPopulationRow } from "@/lib/collection/adapters/resident-population";
import { quarterEndDate } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

interface CommercialStoreRow {
  STDR_YYQU_CD: string;
  ADSTRD_CD: string;
  ADSTRD_CD_NM: string;
  SVC_INDUTY_CD: string;
  SVC_INDUTY_CD_NM: string;
  SIMILR_INDUTY_STOR_CO: number | null;
  OPBIZ_RT: number | null;
  OPBIZ_STOR_CO: number | null;
  CLSBIZ_RT: number | null;
  CLSBIZ_STOR_CO: number | null;
}

const nullableNumber = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().nullable(),
);

const conditionRowSchema = z.object({
  NM: z.string(),
  CD: z.coerce.string(),
  GUBUN: z.string(),
  FIRST_TOT: nullableNumber,
  SECOND_TOT: nullableNumber,
  THIRD_TOT: nullableNumber,
});

export function summarizeCommercialStoreRows(rows: CommercialStoreRow[]) {
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

function shiftQuarter(quarterCode: string, offset: number) {
  const index = Number(quarterCode.slice(0, 4)) * 4 + Number(quarterCode.slice(4)) - 1 + offset;
  return `${Math.floor(index / 4)}${(index % 4) + 1}`;
}

function quarterLabel(quarterCode: string) {
  return `${quarterCode.slice(0, 4)}년 ${quarterCode.slice(4)}분기`;
}

export const commercialStoreAdapter: SourceAdapter = {
  code: "commercial-store",
  cycle: "quarterly",
  async collect(context) {
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const data = await fetchGolmokConditionRows(
      "selectStoreCount.json",
      "store",
      districtCode,
      conditionRowSchema,
      { svcIndutyCdL: "CS000000", svcIndutyCdM: "all" },
    );
    const target = data.rows.find((row) =>
      row.CD === context.administrativeDongCode && row.NM === context.administrativeDongName
    );
    if (!target) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: data.rows.length,
        recordsSaved: 0,
        recordsSkipped: data.rows.length,
        indicators: [],
        rawPayloads: data.rawPayloads,
      };
    }
    const candidates = data.rows.filter((row) =>
      row.GUBUN === "dong" && row.CD !== context.administrativeDongCode
    );
    const previousQuarter = shiftQuarter(data.period, -1);
    const firstQuarter = shiftQuarter(data.period, -2);
    let residentRows: ResidentPopulationRow[] = [];
    let residentPayloads: unknown[] = [];
    try {
      const residentData = await fetchAllSeoulRows<ResidentPopulationRow>(
        context.apiKey,
        "VwsmAdstrdRepopW",
        residentPopulationRowSchema,
      );
      residentRows = residentData.rows;
      residentPayloads = residentData.payloads;
    } catch {
      // 점포 수 조건검색 결과는 가구 수 API 상태와 무관하게 표시한다.
    }
    const residentData = { rows: residentRows };
    const latestResidents = selectLatestResidentPopulationRows(residentData.rows);
    const sameQuarterResidents = residentData.rows.filter((row) => row.STDR_YYQU_CD === data.period);
    const previousQuarterResidents = residentData.rows.filter((row) => row.STDR_YYQU_CD === previousQuarter);
    const householdByDong = new Map(sameQuarterResidents.map((row) => [row.ADSTRD_CD, row.TOT_HSHLD_CO]));
    const previousHouseholdByDong = new Map(previousQuarterResidents.map((row) => [row.ADSTRD_CD, row.TOT_HSHLD_CO]));
    const targetStoreDensity = target.THIRD_TOT === null
      ? null
      : storesPer1000Households(target.THIRD_TOT, householdByDong.get(target.CD) ?? null);
    const previousStoreDensity = target.SECOND_TOT === null
      ? null
      : storesPer1000Households(target.SECOND_TOT, previousHouseholdByDong.get(target.CD) ?? null);
    const candidateStoreDensity = (row: z.infer<typeof conditionRowSchema>) => row.THIRD_TOT === null
      ? null
      : storesPer1000Households(row.THIRD_TOT, householdByDong.get(row.CD) ?? null);
    const comparisonData = (
      unit: string,
      targetValue: number | null,
      select: (row: z.infer<typeof conditionRowSchema>) => number | null,
    ) => ({
      target: { areaCode: target.CD, areaName: target.NM, cityCode: target.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: targetValue },
      candidates: candidates.map((row) => ({ areaCode: row.CD, areaName: row.NM, cityCode: row.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: select(row) })),
    });
    const baseDate = quarterEndDate(data.period);
    const common = {
      area: "상권 변화" as const,
      baseDate,
      comparisonLabel: "동일 자치구 다른 행정동 평균",
      favorableDirection: "CONTEXT_DEPENDENT" as const,
      source: "서울시 상권분석서비스 지역별 현황(조건검색)",
      sourceUrl: "https://golmok.seoul.go.kr/stateArea.do",
      geographicUnit: `${context.administrativeDongName} 행정동 전체`,
      collectedAt: context.now.toISOString(),
      updateCycle: "분기",
    };
    return {
      sourceCode: this.code,
      status: target.THIRD_TOT === null ? "empty" : "success",
      recordsRead: data.rows.length + residentRows.length,
      recordsSaved: 2,
      recordsSkipped: data.rows.length - 1,
      indicators: [
        {
          ...common,
          code: "store_density",
          name: "1,000가구당 점포 수",
          value: targetStoreDensity,
          previousValue: previousStoreDensity,
          unit: "개/1,000가구",
          status: targetStoreDensity === null ? "empty" as const : "success" as const,
          statusMessage: targetStoreDensity === null
            ? `점포 기준분기(${data.period})와 같은 가구 수가 없어 대체 밀도를 계산할 수 없습니다. 가구 자료 최신분기는 ${latestResidents.quarter || "없음"}입니다.`
            : "점포 수를 같은 기준분기의 가구 수로 나눈 1,000가구당 점포 수입니다.",
          proxyDescription: "지역 면적 대신 가구 수로 정규화한 점포 분포 대체지표이며 물리적 면적 밀도와 동일하지 않습니다.",
          series: [],
          spatialComparison: comparisonData("개/1,000가구", targetStoreDensity, candidateStoreDensity),
        },
        {
          ...common,
          code: "store_count",
          name: "점포 수",
          value: target.THIRD_TOT,
          previousValue: target.SECOND_TOT,
          unit: "개",
          status: target.THIRD_TOT === null ? "empty" as const : "success" as const,
          statusMessage: `서울시 상권분석서비스 지역별 현황의 ${quarterLabel(data.period)} 전체 생활밀접업종 점포 수입니다.`,
          proxyDescription: "같은 자치구 내 점포 수 백분위를 1~5점으로 환산한 상권 규모 참고지표이며, 높고 낮음 자체가 상권의 질이나 성과를 뜻하지 않습니다.",
          series: [
            { date: quarterLabel(firstQuarter), value: target.FIRST_TOT },
            { date: quarterLabel(previousQuarter), value: target.SECOND_TOT },
            { date: quarterLabel(data.period), value: target.THIRD_TOT },
          ],
          spatialComparison: comparisonData("개", target.THIRD_TOT, (row) => row.THIRD_TOT),
        },
      ],
      rawPayloads: [...data.rawPayloads, ...residentPayloads],
    };
  },
};
