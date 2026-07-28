import { z } from "zod";
import type { SourceAdapter } from "@/lib/collection/types";

const SITE_URL = "https://www.binzibe.kr/main/html/map.html";
const BASE_URL = "https://www.binzibe.kr";
const filterSchema = z.object({
  years: z.array(z.object({ year: z.coerce.number().int() })).min(1),
});
const stateRowSchema = z.object({
  reg: z.coerce.string(),
  sojaeji: z.string(),
  binCnt: z.coerce.number().nullable(),
  baseLevel: z.coerce.number().int(),
  rnk: z.coerce.number().nullable().optional(),
});

async function fetchJson(path: string, referer = SITE_URL) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** (attempt - 1)));
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          accept: "application/json",
          referer,
          "user-agent": "UrbanRegenerationVacancyCollector/1.0 public-aggregate-only",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
        throw new Error("JSON이 아닌 응답");
      }
      return await response.json() as unknown;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`빈집애 공개 요청 실패: ${lastError instanceof Error ? lastError.message : "알 수 없는 오류"}`);
}

function legalDongName(row: z.infer<typeof stateRowSchema>) {
  return row.sojaeji.split("_").at(-1) ?? "";
}

export const binzibeVacancyAdapter: SourceAdapter = {
  code: "vacant-house",
  cycle: "quarterly",
  async collect(context) {
    await fetch(SITE_URL, {
      headers: { "user-agent": "UrbanRegenerationVacancyCollector/1.0 public-aggregate-only" },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
    const filterPayload = await fetchJson("/apihome/map/filter-options");
    const { years } = filterSchema.parse(filterPayload);
    const year = years[0].year;
    const statePayload = await fetchJson(`/apihome/state/list?year=${year}`);
    const rows = z.array(stateRowSchema).parse(statePayload);
    const districtRows = rows.filter((row) => row.baseLevel === 3 && row.reg === context.administrativeDongCode.slice(0, 5));
    const target = districtRows.find((row) => legalDongName(row) === context.legalDongName);
    if (!target) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: rows.length,
        recordsSaved: 0,
        recordsSkipped: rows.length,
        indicators: [],
        rawPayloads: [filterPayload, statePayload],
      };
    }
    const isLegalProxy = context.legalDongName !== context.administrativeDongName;
    const statusMessage = isLegalProxy
      ? `빈집애는 ${context.administrativeDongName} 행정동 독립값을 제공하지 않아 ${context.legalDongName} 법정동 전체 ${target.binCnt ?? "미제공"}호를 표시합니다. 같은 법정동을 공유하는 행정동에는 동일값이 표시됩니다.`
      : `빈집애의 ${context.legalDongName} 법정동 전체 집계입니다. 행정동명은 같지만 출처 집계경계는 법정동 기준입니다.`;
    const districtCode = context.administrativeDongCode.slice(0, 5);
    return {
      sourceCode: this.code,
      status: target.binCnt === null ? "empty" : "success",
      recordsRead: rows.length,
      recordsSaved: target.binCnt === null ? 0 : 1,
      recordsSkipped: rows.length - 1,
      indicators: [{
        code: "vacant_house_count",
        name: "빈집 수",
        area: "주거환경",
        value: target.binCnt,
        previousValue: null,
        unit: "호",
        baseDate: `${year}-01-01`,
        comparisonLabel: "동일 자치구 다른 법정동 평균",
        favorableDirection: "LOWER_IS_BETTER",
        status: target.binCnt === null ? "empty" : "success",
        source: "빈집애(REB) 빈집지도 기반 행정동별 공공데이터 보조지표",
        sourceUrl: SITE_URL,
        geographicUnit: `${context.legalDongName} 법정동 전체${isLegalProxy ? ` (${context.administrativeDongName} 대체값)` : ""}`,
        collectedAt: context.now.toISOString(),
        updateCycle: "연 1회 확인",
        statusMessage: `${statusMessage} 사이트는 조사연도만 제공하며 표시된 날짜는 ${year}년 기간 식별용입니다.`,
        proxyDescription: "지자체 빈집행정조사 기반 단순 수량 정보로 국가승인통계, 주민 만족도 또는 도시재생사업 효과를 직접 측정하지 않습니다.",
        series: [],
        spatialComparison: {
          target: {
            areaCode: context.administrativeDongCode,
            areaName: context.legalDongName,
            cityCode: context.administrativeDongCode.slice(0, 2),
            districtCode,
            geographicUnit: "LEGAL_DONG",
            basePeriod: String(year),
            unit: "호",
            value: target.binCnt,
          },
          candidates: districtRows
            .filter((row) => legalDongName(row) !== context.legalDongName)
            .map((row) => ({
              areaCode: `LEGAL:${districtCode}:${legalDongName(row)}`,
              areaName: legalDongName(row),
              cityCode: context.administrativeDongCode.slice(0, 2),
              districtCode,
              geographicUnit: "LEGAL_DONG" as const,
              basePeriod: String(year),
              unit: "호",
              value: row.binCnt,
            })),
        },
      }],
      rawPayloads: [filterPayload, statePayload],
    };
  },
};
