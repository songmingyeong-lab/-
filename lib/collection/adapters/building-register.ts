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
  USE_APRV_YMD: z.string().nullable().optional(),
});

export type BuildingRegisterRow = z.infer<typeof rowSchema>;

function parseApprovalDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function summarizeBuildingRegister(
  rows: BuildingRegisterRow[],
  target: { cityName: string; districtName: string; dongName: string },
  referenceDate: Date,
) {
  const districtName = `${target.cityName} ${target.districtName}`;
  const matched = rows.filter((row) => row.SGG_CD_NM === districtName && row.STDG_CD_NM === target.dongName);
  const unique = [...new Map(matched.map((row) => [`${row.BDRG_SN}|${row.PLAT_PLC}`, row])).values()];
  const agedValues = unique.map((row) => isAgedBuilding(parseApprovalDate(row.USE_APRV_YMD), referenceDate));
  const knownCount = agedValues.filter((value) => value !== null).length;
  const agedCount = agedValues.filter((value) => value === true).length;
  const coverageRate = unique.length === 0 ? 0 : (knownCount / unique.length) * 100;

  return {
    totalCount: unique.length,
    knownCount,
    missingCount: unique.length - knownCount,
    agedCount,
    coverageRate,
    ratio: calculateAgedBuildingRatio(agedValues),
  };
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
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema);
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

    if (summary.ratio === null) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: data.rows.length,
        recordsSaved: 0,
        recordsSkipped: data.rows.length - summary.totalCount,
        indicators: [],
        rawPayloads: data.payloads,
        error: `가리봉동 총괄표제부 ${summary.totalCount}건 모두 사용승인일이 없어 노후도를 계산할 수 없습니다.`,
      };
    }

    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - summary.totalCount,
      indicators: [{
        code: "aged_building_ratio",
        name: "총괄표제부 기준 30년 이상 건축물 비율",
        area: "주거환경",
        value: summary.ratio,
        previousValue: null,
        unit: "%",
        baseDate: seoulDate(context.now),
        comparisonLabel: "직전 수집 대비",
        favorableDirection: "LOWER_IS_BETTER",
        status: summary.coverageRate < 50 ? "insufficient_sample" : "success",
        source: "서울시 건축물대장 총괄표제부",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do",
        geographicUnit: `${context.districtName} ${context.dongName} 법정동`,
        collectedAt: context.now.toISOString(),
        updateCycle: "매일 1회(현재 현행화 일시 중단)",
        statusMessage: `총괄표제부 ${summary.totalCount}건 중 사용승인일 확인 ${summary.knownCount}건(자료 완전성 ${summary.coverageRate.toFixed(1)}%)으로 계산했습니다. 30년 이상 ${summary.agedCount}건, 사용승인일 누락 ${summary.missingCount}건입니다.${summary.coverageRate < 50 ? " 사용승인일 확인 자료가 절반 미만이므로 표본 불충분 상태의 참고값입니다." : ""} 총괄표제부는 같은 부지에 표제부가 2개 이상인 경우 생성되므로 가리봉동 전체 건축물을 대표하지 않습니다.`,
        proxyDescription: "총괄표제부가 생성된 대지의 노후 정도를 보여주는 보조지표이며, 가리봉동의 모든 개별 건축물을 포함하는 비율은 아닙니다.",
        series: [],
      }],
      rawPayloads: data.payloads,
    };
  },
};
