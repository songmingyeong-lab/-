import { z } from "zod";
import { fetchAllSeoulRows } from "@/lib/api/seoul-client";
import type { SourceAdapter } from "@/lib/collection/types";

const service = "SPOP_LOCAL_RESD_DONG";
const rowSchema = z.object({
  STDR_DE_ID: z.string(),
  TMZON_PD_SE: z.coerce.string(),
  ADSTRD_CODE_SE: z.coerce.string(),
  TOT_LVPOP_CO: z.coerce.number().nullable(),
});

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function averagesByDong(rows: Array<z.infer<typeof rowSchema>>) {
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    if (row.TOT_LVPOP_CO === null) continue;
    grouped.set(row.ADSTRD_CODE_SE, [...(grouped.get(row.ADSTRD_CODE_SE) ?? []), row.TOT_LVPOP_CO]);
  }
  return [...grouped.entries()].map(([code, values]) => ({ code, value: values.reduce((sum, value) => sum + value, 0) / values.length }));
}

export const livingPopulationAdapter: SourceAdapter = {
  code: "living-population",
  cycle: "daily",
  async collect(context) {
    let data: Awaited<ReturnType<typeof fetchAllSeoulRows<z.infer<typeof rowSchema>>>> | null = null;
    let baseDate = "";
    const expectedLatest = new Date(context.now);
    expectedLatest.setUTCDate(expectedLatest.getUTCDate() - 5);
    const candidates = [expectedLatest, new Date(Date.UTC(context.now.getUTCFullYear(), context.now.getUTCMonth(), 0)), new Date(Date.UTC(context.now.getUTCFullYear(), context.now.getUTCMonth() - 1, 0))];
    for (const target of candidates) {
      baseDate = compactDate(target);
      const candidate = await fetchAllSeoulRows(context.apiKey, service, rowSchema, [baseDate]);
      if (candidate.rows.length > 0) { data = candidate; break; }
    }
    if (!data) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [] };
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const values = averagesByDong(data.rows.filter((row) => row.ADSTRD_CODE_SE.startsWith(districtCode)));
    const target = values.find((item) => item.code === context.administrativeDongCode);
    if (!target) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.payloads };
    const displayDate = `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6)}`;
    const spatialComparison = {
      target: { areaCode: target.code, areaName: context.dongName, cityCode: target.code.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: baseDate, unit: "명", value: target.value },
      candidates: values.filter((item) => item.code !== target.code).map((item) => ({ areaCode: item.code, areaName: item.code, cityCode: item.code.slice(0, 2), districtCode: item.code.slice(0, 5), geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: baseDate, unit: "명", value: item.value })),
    };
    return {
      sourceCode: this.code, status: "success", recordsRead: data.rows.length, recordsSaved: 1, recordsSkipped: data.rows.length - values.length,
      indicators: [{
        code: "living_population", name: "일평균 생활인구", area: "활력·혼잡", value: target.value, previousValue: null, unit: "명",
        baseDate: displayDate, comparisonLabel: "구로구 다른 행정동 평균 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success",
        source: "행정동 단위 서울 생활인구(내국인)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        collectedAt: context.now.toISOString(), updateCycle: "매일", statusMessage: null,
        proxyDescription: "지역에 머문 인구 규모를 구로구 다른 행정동과 비교하며 주민 만족도를 직접 의미하지 않습니다.", series: [], spatialComparison,
      }],
      rawPayloads: data.payloads,
    };
  },
};
