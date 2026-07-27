import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import { quarterEndDate } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "VwsmAdstrdRepopW";
export const residentPopulationRowSchema = z.object({
  STDR_YYQU_CD: z.coerce.string(),
  ADSTRD_CD: z.coerce.string(),
  ADSTRD_CD_NM: z.string(),
  TOT_HSHLD_CO: z.coerce.number().nullable(),
});

export type ResidentPopulationRow = z.infer<typeof residentPopulationRowSchema>;

export function selectLatestResidentPopulationRows(rows: ResidentPopulationRow[]) {
  const quarter = rows.reduce((latest, row) => row.STDR_YYQU_CD > latest ? row.STDR_YYQU_CD : latest, "");
  return { quarter, rows: rows.filter((row) => row.STDR_YYQU_CD === quarter) };
}

export const residentPopulationAdapter: SourceAdapter = {
  code: "resident-population",
  cycle: "quarterly",
  async collect(context) {
    const data = await fetchAllSeoulRows(context.apiKey, service, residentPopulationRowSchema);
    const latest = selectLatestResidentPopulationRows(data.rows);
    const quarter = latest.quarter;
    if (!quarter) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [], rawPayloads: data.payloads };

    const target = latest.rows.find((row) => row.ADSTRD_CD === context.administrativeDongCode && row.ADSTRD_CD_NM === context.administrativeDongName);
    if (!target) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.payloads };

    const districtCode = context.administrativeDongCode.slice(0, 5);
    const candidates = latest.rows.filter((row) =>
      row.ADSTRD_CD.startsWith(districtCode)
      && row.ADSTRD_CD !== context.administrativeDongCode
    );
    const spatialComparison = {
      target: {
        areaCode: target.ADSTRD_CD,
        areaName: target.ADSTRD_CD_NM,
        cityCode: target.ADSTRD_CD.slice(0, 2),
        districtCode,
        geographicUnit: "ADMINISTRATIVE_DONG" as const,
        basePeriod: quarter,
        unit: "가구",
        value: target.TOT_HSHLD_CO,
      },
      candidates: candidates.map((row) => ({
        areaCode: row.ADSTRD_CD,
        areaName: row.ADSTRD_CD_NM,
        cityCode: row.ADSTRD_CD.slice(0, 2),
        districtCode: row.ADSTRD_CD.slice(0, 5),
        geographicUnit: "ADMINISTRATIVE_DONG" as const,
        basePeriod: quarter,
        unit: "가구",
        value: row.TOT_HSHLD_CO,
      })),
    };

    return {
      sourceCode: this.code,
      status: target.TOT_HSHLD_CO === null ? "empty" : "success",
      recordsRead: data.rows.length,
      recordsSaved: target.TOT_HSHLD_CO === null ? 0 : 1,
      recordsSkipped: data.rows.length - 1,
      indicators: [{
        code: "household_count",
        name: "총 가구 수",
        area: "상권 변화",
        value: target.TOT_HSHLD_CO,
        previousValue: null,
        unit: "가구",
        baseDate: quarterEndDate(quarter),
        comparisonLabel: "동일 자치구 다른 행정동 평균",
        favorableDirection: "CONTEXT_DEPENDENT",
        status: target.TOT_HSHLD_CO === null ? "empty" : "success",
        source: "서울시 상권분석서비스(상주인구-행정동)",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do",
        geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "분기",
        statusMessage: target.TOT_HSHLD_CO === null ? "공식 응답의 총 가구 수가 비어 있습니다." : null,
        proxyDescription: "행정동의 상주인구 기반 총 가구 수로 실제 소비 가구나 방문 가구 수를 뜻하지 않습니다.",
        series: [],
        spatialComparison,
      }],
      rawPayloads: data.payloads,
    };
  },
};
