import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";
import { calculateAgedBuildingRatio, isAgedBuilding } from "@/lib/indicators/building-age";

const service = "vBigDjrRecapTitle";

const rowSchema = z.object({
  PLAT_PLC: z.string(),
  SGG_CD_NM: z.string(),
  STDG_CD_NM: z.string(),
  BDRG_SN: z.union([z.string(), z.number()]).transform(String),
  MN_USG_CD_NM: z.string().nullable().optional(),
  USE_APRV_YMD: z.string().nullable().optional(),
});

export type BuildingRegisterRow = z.infer<typeof rowSchema>;

export function summarizeBuildingRegister(
  rows: BuildingRegisterRow[],
  target: { cityName: string; districtName: string; dongName: string },
  referenceDate = new Date(),
) {
  const districtName = `${target.cityName} ${target.districtName}`;
  const matched = rows.filter((row) => row.SGG_CD_NM === districtName && row.STDG_CD_NM === target.dongName);
  const unique = [...new Map(matched.map((row) => [`${row.BDRG_SN}|${row.PLAT_PLC}`, row])).values()];
  const educationWelfareCount = unique.filter((row) => row.MN_USG_CD_NM === "교육연구및복지시설").length;
  const cultureAssemblyCount = unique.filter((row) => row.MN_USG_CD_NM === "문화및집회시설").length;
  const agedValues = unique.map((row) => isAgedBuilding(parseApprovalDate(row.USE_APRV_YMD), referenceDate));
  const knownCount = agedValues.filter((value) => value !== null).length;
  const agedCount = agedValues.filter((value) => value === true).length;

  return {
    totalCount: unique.length,
    knownCount,
    missingCount: unique.length - knownCount,
    agedCount,
    coverageRate: unique.length === 0 ? 0 : (knownCount / unique.length) * 100,
    agedRatio: calculateAgedBuildingRatio(agedValues),
    educationWelfareCount,
    cultureAssemblyCount,
    targetFacilityCount: educationWelfareCount + cultureAssemblyCount,
  };
}

function parseApprovalDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function seoulDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const buildingRegisterAdapter: SourceAdapter = {
  code: "building-register",
  cycle: "monthly",
  async collect(context) {
    const districtName = `${context.cityName} ${context.districtName}`;
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [" ", districtName, context.dongName]);
    const summary = summarizeBuildingRegister(data.rows, context, context.now);

    if (summary.totalCount === 0) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: data.rows.length,
        recordsSaved: 0,
        recordsSkipped: data.rows.length,
        indicators: [],
        rawPayloads: data.payloads,
        error: "서울시 총괄표제부에서 가리봉동 자료를 찾지 못했습니다.",
      };
    }

    if (summary.agedRatio === null) {
      return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length - summary.totalCount, indicators: [], rawPayloads: data.payloads, error: "가리봉동 총괄표제부의 사용승인일이 없어 노후건축물 비율을 계산할 수 없습니다." };
    }
    const districtRows = data.rows.filter((row) => row.SGG_CD_NM === districtName);
    const dongNames = [...new Set(districtRows.map((row) => row.STDG_CD_NM).filter(Boolean))];
    const summaries = dongNames.map((dongName) => ({ dongName, summary: summarizeBuildingRegister(districtRows, { cityName: context.cityName, districtName: context.districtName, dongName }, context.now) }));
    const basePeriod = seoulDate(context.now);
    const comparisonData = (unit: string, select: (item: typeof summary) => number | null) => ({
      target: { areaCode: context.administrativeDongCode, areaName: context.dongName, cityCode: "11", districtCode: context.administrativeDongCode.slice(0, 5), geographicUnit: "LEGAL_DONG" as const, basePeriod, unit, value: select(summary) },
      candidates: summaries.filter((item) => item.dongName !== context.dongName).map((item) => ({ areaCode: `LEGAL:${item.dongName}`, areaName: item.dongName, cityCode: "11", districtCode: context.administrativeDongCode.slice(0, 5), geographicUnit: "LEGAL_DONG" as const, basePeriod, unit, value: select(item.summary) })),
    });

    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 2,
      recordsSkipped: data.rows.length - summary.totalCount,
      indicators: [
        {
          code: "aged_building_ratio",
          name: "총괄표제부 기준 30년 이상 건축물 비율",
          area: "주거환경",
          value: summary.agedRatio,
          previousValue: null,
          unit: "%",
          baseDate: basePeriod,
          comparisonLabel: "구로구 다른 법정동 평균 대비",
          favorableDirection: "LOWER_IS_BETTER",
          status: summary.coverageRate < 50 ? "insufficient_sample" : "success",
          source: "서울시 건축물대장 총괄표제부",
          sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do",
          geographicUnit: `${context.districtName} ${context.dongName} 법정동`,
          collectedAt: context.now.toISOString(),
          updateCycle: "매일 1회(현재 현행화 일시 중단)",
          statusMessage: `가리봉동 총괄표제부 ${summary.totalCount}건 중 사용승인일 확인 ${summary.knownCount}건으로 계산했습니다. 30년 이상 ${summary.agedCount}건, 승인일 누락 ${summary.missingCount}건이며 자료 완전성은 ${summary.coverageRate.toFixed(1)}%입니다.`,
          proxyDescription: "총괄표제부가 생성된 대지 중 사용승인일 확인 건의 노후 비율이며 가리봉동의 모든 개별 건축물을 포함하는 비율은 아닙니다.",
          series: [],
          spatialComparison: comparisonData("%", (item) => item.agedRatio),
        },
        {
          code: "urban_regeneration_hub_count",
          name: "거점시설 수",
          area: "공동체·거점",
          value: summary.targetFacilityCount,
          previousValue: null,
          unit: "개",
          baseDate: seoulDate(context.now),
          comparisonLabel: "직전 수집 대비",
          favorableDirection: "NEUTRAL",
          status: "success",
          source: "서울시 건축물대장 총괄표제부",
          sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do",
          geographicUnit: `${context.districtName} ${context.dongName} 법정동`,
          collectedAt: context.now.toISOString(),
          updateCycle: "매일 1회(현재 현행화 일시 중단)",
          statusMessage: `가리봉동 법정동 총괄표제부 ${summary.totalCount}건의 주용도코드명 기준으로 교육연구및복지시설 ${summary.educationWelfareCount}개, 문화및집회시설 ${summary.cultureAssemblyCount}개를 합산했습니다.`,
          proxyDescription: "총괄표제부 주용도코드명으로 분류한 시설 수이며 실제 거점 기능, 운영 여부 또는 이용 가능 여부를 뜻하지 않습니다.",
          series: [],
          spatialComparison: comparisonData("개", (item) => item.targetFacilityCount),
        },
      ],
      rawPayloads: data.payloads,
    };
  },
};
