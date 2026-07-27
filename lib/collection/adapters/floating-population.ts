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
  TOT_FLPOP_CO_2: nullableNumber,
  TOT_FLPOP_CO_3: nullableNumber,
  TOT_REPOP_CO_2: nullableNumber,
  TOT_REPOP_CO_3: nullableNumber,
  TOT_WRC_POPLTN_CO_2: nullableNumber,
  TOT_WRC_POPLTN_CO_3: nullableNumber,
});

export const floatingPopulationAdapter: SourceAdapter = {
  code: "floating-population",
  cycle: "quarterly",
  async collect(context) {
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const data = await fetchGolmokConditionRows(
      "selectPopulation.json",
      "population",
      districtCode,
      rowSchema,
    );
    const target = data.rows.find(
      (row) => row.CD === context.administrativeDongCode && row.NM === context.administrativeDongName,
    );
    if (!target) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: data.rows.length,
        recordsSaved: 0,
        recordsSkipped: data.rows.length,
        indicators: [],
        rawPayloads: data.rawPayloads,
      };
    }

    const candidates = data.rows.filter(
      (row) => row.GUBUN === "dong" && row.CD !== context.administrativeDongCode,
    );
    const indicatorSpecs = [{
      code: "street_floating_population_density",
      name: "길 단위 유동인구",
      currentField: "TOT_FLPOP_CO_3",
      previousField: "TOT_FLPOP_CO_2",
      description: "공식 지역별 현황 화면의 길 단위 유동인구를 1ha당 인원으로 표시합니다.",
      proxy: "서울시 상권분석서비스가 산출한 1ha당 길 단위 유동인구이며 실제 보행자 전수조사와 동일하지 않습니다.",
    }, {
      code: "residential_population_density",
      name: "주거인구",
      currentField: "TOT_REPOP_CO_3",
      previousField: "TOT_REPOP_CO_2",
      description: "공식 지역별 현황 화면의 주거인구를 1ha당 인원으로 표시합니다.",
      proxy: "서울시 상권분석서비스가 산출한 1ha당 주거인구이며 주민등록인구 총수와 동일하지 않습니다.",
    }, {
      code: "workplace_population_density",
      name: "직장인구",
      currentField: "TOT_WRC_POPLTN_CO_3",
      previousField: "TOT_WRC_POPLTN_CO_2",
      description: "공식 지역별 현황 화면의 직장인구를 1ha당 인원으로 표시합니다.",
      proxy: "서울시 상권분석서비스가 산출한 1ha당 직장인구이며 사업체 종사자 전수와 동일하지 않습니다.",
    }] as const;
    const indicators = indicatorSpecs.map((spec) => {
      const value = target[spec.currentField];
      return {
        code: spec.code,
        name: spec.name,
        area: "활력·혼잡" as const,
        value,
        previousValue: target[spec.previousField],
        unit: "명/ha",
        baseDate: quarterEndDate(data.period),
        comparisonLabel: "동일 자치구 다른 행정동 평균",
        favorableDirection: "CONTEXT_DEPENDENT" as const,
        status: value === null ? "empty" as const : "success" as const,
        source: "서울시 상권분석서비스 지역별 현황(조건검색)",
        sourceUrl: "https://golmok.seoul.go.kr/stateArea.do",
        geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "분기",
        statusMessage: value === null
          ? `서울시 상권분석서비스 조건검색 응답에 해당 행정동의 ${spec.name} 값이 없습니다.`
          : spec.description,
        proxyDescription: spec.proxy,
        series: [],
        spatialComparison: {
          target: {
            areaCode: target.CD,
            areaName: target.NM,
            cityCode: target.CD.slice(0, 2),
            districtCode,
            geographicUnit: "ADMINISTRATIVE_DONG" as const,
            basePeriod: data.period,
            unit: "명/ha",
            value,
          },
          candidates: candidates.map((row) => ({
            areaCode: row.CD,
            areaName: row.NM,
            cityCode: row.CD.slice(0, 2),
            districtCode,
            geographicUnit: "ADMINISTRATIVE_DONG" as const,
            basePeriod: data.period,
            unit: "명/ha",
            value: row[spec.currentField],
          })),
        },
      };
    });
    return {
      sourceCode: this.code,
      status: indicators.every((indicator) => indicator.value === null) ? "empty" : "success",
      recordsRead: data.rows.length,
      recordsSaved: indicators.filter((indicator) => indicator.value !== null).length,
      recordsSkipped: data.rows.length - 1,
      indicators,
      rawPayloads: data.rawPayloads,
    };
  },
};
