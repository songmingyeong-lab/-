import { z } from "zod";
import { fetchGolmokConditionRows } from "@/lib/api/golmok-client";
import { quarterEndDate } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const nullableNumber = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().nullable(),
);

const rowSchema = z.object({
  NM: z.string(),
  CD: z.coerce.string(),
  GUBUN: z.string(),
  OPBIZ_STOR_CO_2: nullableNumber,
  CLSBIZ_STOR_CO_2: nullableNumber,
  OPBIZ_RT_2: nullableNumber,
  CLSBIZ_RT_2: nullableNumber,
  OPBIZ_STOR_CO_3: nullableNumber,
  CLSBIZ_STOR_CO_3: nullableNumber,
  OPBIZ_RT_3: nullableNumber,
  CLSBIZ_RT_3: nullableNumber,
});

export const commercialOpeningMarketAdapter: SourceAdapter = {
  code: "commercial-opening-market",
  cycle: "quarterly",
  async collect(context) {
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const data = await fetchGolmokConditionRows(
      "selectOpening.json",
      "opening",
      districtCode,
      rowSchema,
      { svcIndutyCdL: "CS000000", svcIndutyCdM: "all" },
    );
    const target = data.rows.find((row) => row.CD === context.administrativeDongCode && row.NM === context.administrativeDongName);
    if (!target) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.rawPayloads };
    const candidates = data.rows.filter((row) => row.GUBUN === "dong" && row.CD !== context.administrativeDongCode);
    const comparison = (unit: string, select: (row: z.infer<typeof rowSchema>) => number | null) => ({
      target: { areaCode: target.CD, areaName: target.NM, cityCode: target.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: select(target) },
      candidates: candidates.map((row) => ({ areaCode: row.CD, areaName: row.NM, cityCode: row.CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit, value: select(row) })),
    });
    const common = {
      area: "상권 변화" as const,
      baseDate: quarterEndDate(data.period),
      comparisonLabel: "동일 자치구 다른 행정동 평균",
      source: "서울시 상권분석서비스 지역별 현황(조건검색)",
      sourceUrl: "https://golmok.seoul.go.kr/stateArea.do",
      geographicUnit: `${context.administrativeDongName} 행정동 전체`,
      collectedAt: context.now.toISOString(),
      updateCycle: "분기",
      series: [],
    };
    return {
      sourceCode: this.code,
      status: target.OPBIZ_RT_3 === null && target.CLSBIZ_RT_3 === null ? "empty" : "success",
      recordsRead: data.rows.length,
      recordsSaved: 4,
      recordsSkipped: data.rows.length - 1,
      indicators: [{
        ...common,
        code: "opening_count",
        name: "개업 점포 수",
        value: target.OPBIZ_STOR_CO_3,
        previousValue: target.OPBIZ_STOR_CO_2,
        unit: "개",
        favorableDirection: "HIGHER_IS_BETTER" as const,
        status: target.OPBIZ_STOR_CO_3 === null ? "empty" as const : "success" as const,
        statusMessage: "전체 생활밀접업종 조건검색의 당기 개업 점포 수이며 화면에는 표시하지 않고 통합률 계산에만 사용합니다.",
        proxyDescription: "개업률 계산을 위한 내부 원자료입니다.",
        spatialComparison: comparison("개", (row) => row.OPBIZ_STOR_CO_3),
      }, {
        ...common,
        code: "opening_rate",
        name: "개업률",
        value: target.OPBIZ_RT_3,
        previousValue: target.OPBIZ_RT_2,
        unit: "%",
        favorableDirection: "HIGHER_IS_BETTER" as const,
        status: target.OPBIZ_RT_3 === null ? "empty" as const : "success" as const,
        statusMessage: "서울시 상권분석서비스 지역별 현황의 전체 생활밀접업종 공식 개업률입니다.",
        proxyDescription: "당기 개업 신고 점포 수를 전체 점포 수로 나눈 공식 비율이며 개별 점포의 생존 가능성을 뜻하지 않습니다.",
        spatialComparison: comparison("%", (row) => row.OPBIZ_RT_3),
      }, {
        ...common,
        code: "closing_count",
        name: "폐업 점포 수",
        value: target.CLSBIZ_STOR_CO_3,
        previousValue: target.CLSBIZ_STOR_CO_2,
        unit: "개",
        favorableDirection: "LOWER_IS_BETTER" as const,
        status: target.CLSBIZ_STOR_CO_3 === null ? "empty" as const : "success" as const,
        statusMessage: "전체 생활밀접업종 조건검색의 당기 폐업 점포 수이며 화면에는 표시하지 않고 통합률 계산에만 사용합니다.",
        proxyDescription: "폐업률 계산을 위한 내부 원자료입니다.",
        spatialComparison: comparison("개", (row) => row.CLSBIZ_STOR_CO_3),
      }, {
        ...common,
        code: "closing_rate",
        name: "폐업률",
        value: target.CLSBIZ_RT_3,
        previousValue: target.CLSBIZ_RT_2,
        unit: "%",
        favorableDirection: "LOWER_IS_BETTER" as const,
        status: target.CLSBIZ_RT_3 === null ? "empty" as const : "success" as const,
        statusMessage: "서울시 상권분석서비스 지역별 현황의 전체 생활밀접업종 공식 폐업률입니다.",
        proxyDescription: "당기 폐업 신고 점포 수를 전체 점포 수로 나눈 공식 비율이며 폐업 사유나 도시재생 사업 성패를 직접 뜻하지 않습니다.",
        spatialComparison: comparison("%", (row) => row.CLSBIZ_RT_3),
      }],
      rawPayloads: data.rawPayloads,
    };
  },
};
