import { z } from "zod";
import { buildSeoulUrl, fetchSeoulPage } from "@/lib/api/seoul-client";
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

export const livingPopulationAdapter: SourceAdapter = {
  code: "living-population",
  cycle: "daily",
  async collect(context) {
    let page: Awaited<ReturnType<typeof fetchSeoulPage<z.infer<typeof rowSchema>>>> | null = null;
    let baseDate = "";
    for (let daysAgo = 1; daysAgo <= 35; daysAgo += 1) {
      const target = new Date(context.now);
      target.setUTCDate(target.getUTCDate() - daysAgo);
      baseDate = compactDate(target);
      const url = buildSeoulUrl(context.apiKey, service, 1, 1000, [baseDate, " ", context.administrativeDongCode]);
      const candidate = await fetchSeoulPage(url, service, rowSchema);
      if (candidate.rows.length > 0) { page = candidate; break; }
    }
    if (!page) return { sourceCode: this.code, status: "empty", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [] };
    const rows = page.rows.filter((row) => row.ADSTRD_CODE_SE === context.administrativeDongCode);
    const values = rows.map((row) => row.TOT_LVPOP_CO).filter((value): value is number => value !== null);
    if (values.length === 0) return { sourceCode: this.code, status: "empty", recordsRead: page.rows.length, recordsSaved: 0, recordsSkipped: page.rows.length, indicators: [] };
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      sourceCode: this.code, status: "success", recordsRead: page.rows.length, recordsSaved: 1, recordsSkipped: page.rows.length - rows.length,
      indicators: [{
        code: "living_population", name: "일평균 생활인구", category: "활력·혼잡", value: average, previousValue: null, unit: "명",
        baseDate: `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6)}`, comparisonLabel: "직전 수집 대비", favorableDirection: "CONTEXT_DEPENDENT", status: "success",
        source: "행정동 단위 서울 생활인구(내국인)", sourceUrl: "https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do", geographicUnit: "가리봉동 행정동 전체",
        proxyDescription: "지역에 머문 인구 규모의 변화를 보여주며 주민 만족도를 직접 의미하지 않습니다.", series: [],
      }],
      rawPayloads: [page.payload],
    };
  },
};
