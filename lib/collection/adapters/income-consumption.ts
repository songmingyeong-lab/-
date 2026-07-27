import { z } from "zod";
import { fetchGolmokConditionRows } from "@/lib/api/golmok-client";
import { quarterEndDate } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const rowSchema = z.object({
  NM: z.string(),
  CD: z.coerce.string(),
  GUBUN: z.string(),
  INCOME_SCTN_CD_1: z.string(),
  INCOME_SCTN_CD_2: z.string(),
  INCOME_SCTN_CD_3: z.string(),
});

export const INCOME_UNAVAILABLE_REASON = "공식 Open API의 평균소득 컬럼은 삭제되었지만 서울시 상권분석서비스 조건검색은 행정동별 소득분위와 월소득 구간을 제공합니다.";

export function parseIncomeBand(value: string) {
  const match = value.match(/(\d+)분위:([\d,]+)~([\d,]+)원/);
  if (!match) return null;
  const lower = Number(match[2].replaceAll(",", ""));
  const upper = Number(match[3].replaceAll(",", ""));
  return { level: Number(match[1]), lower, upper, midpoint: (lower + upper) / 2 };
}

export const incomeConsumptionAdapter: SourceAdapter = {
  code: "income-consumption",
  cycle: "quarterly",
  async collect(context) {
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const data = await fetchGolmokConditionRows("selectIncome.json", "income", districtCode, rowSchema);
    const target = data.rows.find((row) => row.CD === context.administrativeDongCode && row.NM === context.administrativeDongName);
    if (!target) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.rawPayloads };
    const current = parseIncomeBand(target.INCOME_SCTN_CD_3);
    const previous = parseIncomeBand(target.INCOME_SCTN_CD_2);
    const candidates = data.rows.filter((row) => row.GUBUN === "dong" && row.CD !== context.administrativeDongCode);
    const comparison = (unit: string, select: (value: ReturnType<typeof parseIncomeBand>) => number | null) => ({
      target: { areaCode: target.CD, areaName: target.NM, cityCode: target.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: select(current) },
      candidates: candidates.map((row) => ({ areaCode: row.CD, areaName: row.NM, cityCode: row.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: select(parseIncomeBand(row.INCOME_SCTN_CD_3)) })),
    });
    const common = {
      area: "상권 변화" as const,
      baseDate: quarterEndDate(data.period),
      comparisonLabel: "동일 자치구 다른 행정동 평균",
      favorableDirection: "NEUTRAL" as const,
      source: "서울시 상권분석서비스 지역별 현황(조건검색)",
      sourceUrl: "https://golmok.seoul.go.kr/stateArea.do",
      geographicUnit: `${context.administrativeDongName} 행정동 전체`,
      collectedAt: context.now.toISOString(),
      updateCycle: "분기",
      series: [],
    };
    return {
      sourceCode: this.code,
      status: current ? "success" : "empty",
      recordsRead: data.rows.length,
      recordsSaved: 2,
      recordsSkipped: data.rows.length - 1,
      indicators: [{
        ...common,
        code: "monthly_average_income",
        name: "월 평균 소득",
        value: current?.midpoint ?? null,
        previousValue: previous?.midpoint ?? null,
        unit: "원/월",
        status: current ? "success" as const : "empty" as const,
        statusMessage: current ? `공식 조건검색의 ${target.INCOME_SCTN_CD_3} 구간 중간값을 산출했습니다. 정확한 개인·가구 평균소득 제공값이 아닙니다.` : "공식 조건검색의 소득구간을 해석할 수 없습니다.",
        proxyDescription: "소득분위 월소득 구간의 중간값으로 산출한 참고 지역경제 수준이며 점수와 등급에 반영하지 않습니다.",
        spatialComparison: comparison("원/월", (band) => band?.midpoint ?? null),
      }, {
        ...common,
        code: "income_level",
        name: "소득분위",
        value: current?.level ?? null,
        previousValue: previous?.level ?? null,
        unit: "분위",
        status: current ? "success" as const : "empty" as const,
        statusMessage: current ? `서울시 상권분석서비스 조건검색 공식 표기: ${target.INCOME_SCTN_CD_3}` : "공식 조건검색의 소득분위를 해석할 수 없습니다.",
        proxyDescription: "건강보험료 기준소득월액으로 환산한 주거지 기반 소득분위 참고정보이며 점수와 등급에 반영하지 않습니다.",
        spatialComparison: comparison("분위", (band) => band?.level ?? null),
      }],
      rawPayloads: data.rawPayloads,
    };
  },
};
