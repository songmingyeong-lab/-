import { z } from "zod";
import { fetchGolmokConditionRows } from "@/lib/api/golmok-client";
import { quarterEndDate } from "@/lib/collection/quarter";
import type { SourceAdapter } from "@/lib/collection/types";

const rowSchema = z.object({
  GBN_CD: z.coerce.string(),
  NM: z.string(),
  GUBUN: z.string(),
  BF2_TOT_FLOOR: z.string(),
  BF3_TOT_FLOOR: z.string(),
  BF3_FST_FLOOR: z.string(),
  BF3_EX_FLOOR: z.string(),
});

function numberOrNull(value: string) {
  const parsed = Number(value.trim().replaceAll(",", ""));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

export const commercialRentMarketAdapter: SourceAdapter = {
  code: "commercial-rent-market",
  cycle: "quarterly",
  async collect(context) {
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const data = await fetchGolmokConditionRows("selectRentalPrice.json", "rent", districtCode, rowSchema);
    const target = data.rows.find((row) => row.GBN_CD === context.administrativeDongCode && row.NM === context.administrativeDongName);
    if (!target) return { sourceCode: this.code, status: "empty", recordsRead: data.rows.length, recordsSaved: 0, recordsSkipped: data.rows.length, indicators: [], rawPayloads: data.rawPayloads };
    const value = numberOrNull(target.BF3_TOT_FLOOR);
    const candidates = data.rows.filter((row) => row.GUBUN === "dong" && row.GBN_CD !== context.administrativeDongCode);
    return {
      sourceCode: this.code,
      status: value === null ? "empty" : "success",
      recordsRead: data.rows.length,
      recordsSaved: value === null ? 0 : 1,
      recordsSkipped: data.rows.length - 1,
      indicators: [{
        code: "rent_level",
        name: "상가 환산임대료",
        area: "상권 변화",
        value,
        previousValue: numberOrNull(target.BF2_TOT_FLOOR),
        unit: "원/3.3㎡·월",
        baseDate: quarterEndDate(data.period),
        comparisonLabel: "동일 자치구 다른 행정동 평균",
        favorableDirection: "NEUTRAL",
        status: value === null ? "empty" : "success",
        source: "서울시 상권분석서비스 지역별 현황(조건검색)",
        sourceUrl: "https://golmok.seoul.go.kr/stateArea.do",
        geographicUnit: `${context.administrativeDongName} 행정동 전체`,
        collectedAt: context.now.toISOString(),
        updateCycle: "분기",
        statusMessage: value === null ? "조건검색 응답의 전체층 환산임대료가 비어 있습니다." : `전체층 기준입니다. 1층 ${numberOrNull(target.BF3_FST_FLOOR)?.toLocaleString("ko-KR") ?? "자료 없음"}원, 1층 외 ${numberOrNull(target.BF3_EX_FLOOR)?.toLocaleString("ko-KR") ?? "자료 없음"}원입니다.`,
        proxyDescription: "3.3㎡당 월 환산임대료 참고값이며 점포 면적이 없어 총 임대료 부담률로 환산하지 않고 점수에도 반영하지 않습니다.",
        series: [
          { date: "1층", value: numberOrNull(target.BF3_FST_FLOOR) },
          { date: "1층 외", value: numberOrNull(target.BF3_EX_FLOOR) },
          { date: "전체층", value },
        ],
        spatialComparison: {
          target: { areaCode: target.GBN_CD, areaName: target.NM, cityCode: target.GBN_CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG", basePeriod: data.period, unit: "원/3.3㎡·월", value },
          candidates: candidates.map((row) => ({ areaCode: row.GBN_CD, areaName: row.NM, cityCode: row.GBN_CD.slice(0, 2), districtCode, geographicUnit: "ADMINISTRATIVE_DONG" as const, basePeriod: data.period, unit: "원/3.3㎡·월", value: numberOrNull(row.BF3_TOT_FLOOR) })),
        },
      }],
      rawPayloads: data.rawPayloads,
    };
  },
};
