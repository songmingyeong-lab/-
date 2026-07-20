import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "tvYeyakCOllect";
const textField = z.union([z.string(), z.number()]).transform(String).nullish().transform((value) => value ?? "");

const rowSchema = z.object({
  SVCID: textField,
  MAXCLASSNM: textField,
  MINCLASSNM: textField,
  SVCSTATNM: textField,
  SVCNM: textField,
  PLACENM: textField,
  AREANM: textField,
  DTLCONT: textField,
});

export type PublicServiceReservationRow = z.infer<typeof rowSchema>;

function mentionsDong(row: PublicServiceReservationRow, dongName: string) {
  const keyword = dongName.replace(/동$/, "");
  return `${row.PLACENM} ${row.SVCNM} ${row.DTLCONT}`.includes(dongName) || `${row.PLACENM} ${row.SVCNM} ${row.DTLCONT}`.includes(keyword);
}

export function summarizePublicServiceReservations(rows: PublicServiceReservationRow[], districtName: string, dongName: string) {
  const districtRows = rows.filter((row) => row.AREANM === districtName);
  const targetRows = rows.filter((row) => row.AREANM === districtName && mentionsDong(row, dongName));
  const programIds = new Set(districtRows.map((row) => row.SVCID).filter(Boolean));
  return { districtRows: districtRows.length, matchedRows: targetRows.length, programCount: programIds.size };
}

export const publicServiceReservationAdapter: SourceAdapter = {
  code: "public-program",
  cycle: "daily",
  async collect(context) {
    const data = await fetchAllSeoulRows(context.apiKey, service, rowSchema);
    const summary = summarizePublicServiceReservations(data.rows, context.districtName, context.dongName);
    const baseDate = context.now.toISOString().slice(0, 10);
    const districtNames = [...new Set(data.rows.map((row) => row.AREANM).filter((name) => name.endsWith("구")))];
    const districtCounts = districtNames.map((name) => ({ name, count: new Set(data.rows.filter((row) => row.AREANM === name).map((row) => row.SVCID).filter(Boolean)).size }));
    const targetDistrictCode = context.administrativeDongCode.slice(0, 5);
    const common = {
      area: "공동체·거점" as const,
      previousValue: null,
      baseDate,
      comparisonLabel: "이전 수집 대비",
      favorableDirection: "CONTEXT_DEPENDENT" as const,
      status: "success" as const,
      source: "서울시 공공서비스예약(종합) 정보",
      sourceUrl: "https://data.seoul.go.kr/dataList/OA-20497/S/1/datasetView.do?tab=A",
      geographicUnit: `${context.districtName} 중 명칭·장소·상세내용에 ${context.dongName} 또는 가리봉이 표시된 자료`,
      collectedAt: context.now.toISOString(),
      updateCycle: "매일",
      series: [],
    };

    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: data.rows.length,
      recordsSaved: 1,
      recordsSkipped: data.rows.length - summary.districtRows,
      indicators: [
        {
          ...common,
          code: "resident_program_count",
          name: "주민참여 프로그램",
          value: summary.programCount,
          unit: "건",
          geographicUnit: `${context.districtName} 전체`,
          statusMessage: `공개 예약 ${data.rows.length}행 중 ${context.districtName} ${summary.districtRows}행의 고유 예약서비스 ${summary.programCount}건을 집계했습니다. 도시재생 관련성과 가리봉동 소재 여부는 판정하거나 제외하지 않았습니다.`,
          proxyDescription: "구로구 전체 공공서비스예약 등록 건수이며 실제 참여인원, 주민 주도성 또는 프로그램 성과를 뜻하지 않습니다.",
          spatialComparison: {
            target: { areaCode: targetDistrictCode, areaName: context.districtName, cityCode: "11", districtCode: targetDistrictCode, geographicUnit: "DISTRICT", basePeriod: baseDate, unit: "건", value: summary.programCount },
            candidates: districtCounts.filter((item) => item.name !== context.districtName).map((item) => ({ areaCode: `NAME:${item.name}`, areaName: item.name, cityCode: "11", districtCode: `NAME:${item.name}`, geographicUnit: "DISTRICT", basePeriod: baseDate, unit: "건", value: item.count })),
          },
        },
      ],
      rawPayloads: data.payloads,
    };
  },
};
