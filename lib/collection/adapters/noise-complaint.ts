import snapshot from "@/data/noise-complaints.json";
import type { SourceAdapter } from "@/lib/collection/types";

const sourceUrl = "https://data.seoul.go.kr/dataList/DT201004J030005/S/2/datasetView.do";

export interface DistrictNoiseComplaint {
  districtName: string;
  value: number;
}

function numberFromTitle(value: string) {
  if (!value || value === "-") return null;
  const number = Number(value.replaceAll(",", ""));
  return Number.isFinite(number) ? number : null;
}

export function parseNoiseComplaintGrid(grid: string): DistrictNoiseComplaint[] {
  const result: DistrictNoiseComplaint[] = [];
  for (const match of grid.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const titles = [...match[1].matchAll(/<td\b[^>]*\btitle="([^"]*)"[^>]*>/gi)].map((item) => item[1]);
    const districtName = titles[1];
    const value = numberFromTitle(titles[3]);
    if (districtName?.endsWith("구") && value !== null) result.push({ districtName, value });
  }
  return result;
}

export const noiseComplaintAdapter: SourceAdapter = {
  code: "noise-complaint",
  cycle: "monthly",
  async collect(context) {
    const target = snapshot.rows.find((row) => row.districtName === context.districtName);
    if (!target) {
      return {
        sourceCode: this.code,
        status: "empty",
        recordsRead: snapshot.rows.length,
        recordsSaved: 0,
        recordsSkipped: snapshot.rows.length,
        indicators: [],
        error: `${context.districtName} 소음·진동 민원값을 공식 스냅샷에서 찾지 못했습니다.`,
      };
    }
    const districtCode = context.administrativeDongCode.slice(0, 5);
    const baseDate = `${snapshot.year}-12-31`;
    return {
      sourceCode: this.code,
      status: "success",
      recordsRead: snapshot.rows.length,
      recordsSaved: 1,
      recordsSkipped: 0,
      indicators: [{
        code: "noise_vibration_complaint_count",
        name: `소음·진동 민원(${context.districtName})`,
        area: "생활 불편",
        value: target.value,
        previousValue: null,
        unit: "건",
        baseDate,
        comparisonLabel: "서울시 다른 자치구 평균 대비",
        favorableDirection: "LOWER_IS_BETTER",
        status: "success",
        source: "서울시 소음진동민원 현황 통계",
        sourceUrl,
        geographicUnit: `${context.districtName} 전체(${context.administrativeDongName} 대체값)`,
        collectedAt: context.now.toISOString(),
        updateCycle: "매년(공식 통계 스냅샷 검증)",
        statusMessage: `${snapshot.year}년 ${context.districtName} 전체 소음·진동 민원 ${target.value.toLocaleString("ko-KR")}건입니다. ${context.administrativeDongName} 세부값이 아니며, ${snapshot.verifiedAt}에 확인한 공식 연간 통계 스냅샷입니다.`,
        proxyDescription: `${context.districtName} 전체의 신고 접근성·신고 성향·반복 신고 영향을 받는 자치구 대체지표이며 ${context.administrativeDongName}의 민원 수가 아닙니다.`,
        series: [],
        spatialComparison: {
          target: { areaCode: districtCode, areaName: context.districtName, cityCode: "11", districtCode, geographicUnit: "DISTRICT", basePeriod: snapshot.year, unit: "건", value: target.value },
          candidates: snapshot.rows.filter((row) => row.districtName !== context.districtName).map((row) => ({
            areaCode: `NAME:${row.districtName}`,
            areaName: row.districtName,
            cityCode: "11",
            districtCode: `NAME:${row.districtName}`,
            geographicUnit: "DISTRICT" as const,
            basePeriod: snapshot.year,
            unit: "건",
            value: row.value,
          })),
        },
      }],
      rawPayloads: [snapshot],
    };
  },
};
