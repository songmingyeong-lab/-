import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "TnCnwInfoView";
const textField = z.union([z.string(), z.number()]).transform(String).nullish().transform((value) => value ?? "");

const rowSchema = z.object({
  PRMISN_REQ_NO: textField,
  ATDRC_ID: textField,
  ADSTRD_CD: textField,
  CNW_NM: textField,
  CNWPD_DT: textField,
  PRCS_STTUS_SE: textField,
});

export type RoadExcavationRow = z.infer<typeof rowSchema>;

function parsePeriod(period: string) {
  const match = /^(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})$/.exec(period.trim());
  if (!match) return null;
  const start = new Date(`${match[1]}T00:00:00Z`);
  const end = new Date(`${match[2]}T00:00:00Z`);
  const durationDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Number.isFinite(durationDays) && durationDays > 0 ? { start: match[1], end: match[2], durationDays } : null;
}

export function summarizeRoadExcavationDurations(rows: RoadExcavationRow[], districtName: string, dongName: string) {
  const targetRows = rows.filter((row) => row.ATDRC_ID === districtName && row.ADSTRD_CD === dongName);
  const uniqueRows = [...new Map(targetRows.map((row) => [`${row.PRMISN_REQ_NO}|${row.CNWPD_DT}`, row])).values()];
  const periods = uniqueRows.map((row) => parsePeriod(row.CNWPD_DT)).filter((period): period is NonNullable<typeof period> => period !== null);
  const averageDays = periods.length === 0 ? null : periods.reduce((sum, period) => sum + period.durationDays, 0) / periods.length;
  const latestEndDate = periods.reduce((latest, period) => period.end > latest ? period.end : latest, "");
  return { rawCount: targetRows.length, uniqueCount: uniqueRows.length, parsedCount: periods.length, averageDays, latestEndDate };
}

export const roadExcavationAdapter: SourceAdapter = {
  code: "road-construction",
  cycle: "daily",
  async collect(context) {
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema);
    const summary = summarizeRoadExcavationDurations(data.rows, context.districtName, context.dongName);
    if (summary.averageDays === null) {
      return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.payloads };
    }

    const districtCode = context.administrativeDongCode.slice(0, 5);
    const dongNames = [...new Set(data.rows.filter((row) => row.ATDRC_ID === context.districtName).map((row) => row.ADSTRD_CD).filter(Boolean))];
    const basePeriod = context.now.toISOString().slice(0, 10);
    const comparisonSummaries = dongNames.map((dongName) => ({ dongName, value: summarizeRoadExcavationDurations(data.rows, context.districtName, dongName).averageDays }));
    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - summary.rawCount,
      indicators: [{
        code: "road_excavation_active_count",
        name: "도로굴착 평균 기간",
        area: "생활 불편",
        value: Math.round(summary.averageDays * 10) / 10,
        previousValue: null,
        unit: "일",
        baseDate: summary.latestEndDate,
        comparisonLabel: "이전 수집 대비",
        favorableDirection: "CONTEXT_DEPENDENT",
        status: "success",
        source: "서울시 도로굴착 공사 현황",
        sourceUrl: "https://data.seoul.go.kr/dataList/OA-22901/S/1/datasetView.do",
        geographicUnit: `${context.districtName} ${context.dongName}`,
        collectedAt: context.now.toISOString(),
        updateCycle: "매일",
        statusMessage: `공개된 전체 이력 중 ${context.dongName} ${summary.rawCount}행을 허가번호·공사기간 기준으로 중복 제거한 ${summary.uniqueCount}건의 평균입니다. 시작일과 종료일을 모두 포함했으며 기간 해석 가능 ${summary.parsedCount}건을 사용했습니다.`,
        proxyDescription: "공사별 예정기간의 평균이며 실제 작업일수, 현재 진행 건수 또는 주민 체감 불편을 직접 뜻하지 않습니다.",
        series: [],
        spatialComparison: {
          target: { areaCode: context.administrativeDongCode, areaName: context.dongName, cityCode: "11", districtCode, geographicUnit: "ADMINISTRATIVE_DONG", basePeriod, unit: "일", value: Math.round(summary.averageDays * 10) / 10 },
          candidates: comparisonSummaries.filter((item) => item.dongName !== context.dongName).map((item) => ({ areaCode: `NAME:${item.dongName}`, areaName: item.dongName, cityCode: "11", districtCode, geographicUnit: "ADMINISTRATIVE_DONG", basePeriod, unit: "일", value: item.value })),
        },
      }],
      rawPayloads: data.payloads,
    };
  },
};
