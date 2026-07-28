import type { TargetArea } from "@/lib/areas";
import type { DashboardData, DashboardIndicator, DataStatus } from "@/lib/indicators/types";

const COMPOSITE_NOTE = "창신1·2·3동 및 숭인1동 통합 집계 · 행정동 집계 대체지표";
const SUM_CODES = new Set([
  "store_count",
  "opening_count",
  "closing_count",
  "household_count",
]);
const DISTRICT_PROXY_CODES = new Set(["noise_vibration_complaint_count", "resident_program_count"]);

function valuesFor(code: string, members: DashboardData[]) {
  return members
    .map((member) => member.indicators.find((indicator) => indicator.code === code)?.value ?? null)
    .filter((value): value is number => value !== null);
}

function sumFor(code: string, members: DashboardData[]) {
  const values = valuesFor(code, members);
  return values.length === members.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function comparisonFor(indicator: DashboardIndicator, area: TargetArea) {
  if (!indicator.spatialComparison) return undefined;
  const memberCodes = new Set(["11110670", "11110680", "11110690", "11110700"]);
  const districtCode = area.administrativeDongCode.slice(0, 5);
  return {
    target: {
      ...indicator.spatialComparison.target,
      areaCode: area.administrativeDongCode,
      areaName: area.administrativeDongName,
      districtCode,
      value: indicator.value,
    },
    candidates: indicator.spatialComparison.candidates.filter((candidate) =>
      candidate.districtCode === districtCode
      && !memberCodes.has(candidate.areaCode)
      && !memberCodes.has(candidate.areaCode)),
  };
}

function aggregateValue(code: string, members: DashboardData[]) {
  if (SUM_CODES.has(code)) return sumFor(code, members);
  if (code === "store_density") {
    const stores = sumFor("store_count", members);
    const households = sumFor("household_count", members);
    return stores !== null && households && households > 0 ? (stores / households) * 1_000 : null;
  }
  if (code === "opening_rate" || code === "closing_rate") {
    const count = sumFor(code === "opening_rate" ? "opening_count" : "closing_count", members);
    const stores = sumFor("store_count", members);
    return count !== null && stores && stores > 0 ? (count / stores) * 100 : null;
  }
  if (["street_floating_population_density", "residential_population_density", "workplace_population_density"].includes(code)) {
    const values = valuesFor(code, members);
    return values.length === members.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }
  if (code === "estimated_sales") {
    const stores = members.map((member) => member.indicators.find((item) => item.code === "store_count")?.value ?? null);
    const sales = members.map((member) => member.indicators.find((item) => item.code === code)?.value ?? null);
    if (stores.some((value) => value === null) || sales.some((value) => value === null)) return null;
    const totalStores = stores.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return totalStores > 0
      ? sales.reduce<number>((sum, value, index) => sum + (value ?? 0) * (stores[index] ?? 0), 0) / totalStores
      : null;
  }
  if (code === "monthly_average_income") {
    const households = members.map((member) => member.indicators.find((item) => item.code === "household_count")?.value ?? null);
    const incomes = members.map((member) => member.indicators.find((item) => item.code === code)?.value ?? null);
    if (households.some((value) => value === null) || incomes.some((value) => value === null)) return null;
    const totalHouseholds = households.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return totalHouseholds > 0
      ? incomes.reduce<number>((sum, value, index) => sum + (value ?? 0) * (households[index] ?? 0), 0) / totalHouseholds
      : null;
  }
  if (code === "income_level") {
    const households = members.map((member) => member.indicators.find((item) => item.code === "household_count")?.value ?? null);
    const levels = members.map((member) => member.indicators.find((item) => item.code === code)?.value ?? null);
    if (households.some((value) => value === null) || levels.some((value) => value === null)) return null;
    const totalHouseholds = households.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return totalHouseholds > 0
      ? levels.reduce<number>((sum, value, index) => sum + (value ?? 0) * (households[index] ?? 0), 0) / totalHouseholds
      : null;
  }
  if (code === "rent_level") {
    const values = valuesFor(code, members);
    return values.length === members.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }
  if (code === "median_monthly_rent") {
    const byLegalDong = new Map<string, number>();
    for (const member of members) {
      const value = member.indicators.find((item) => item.code === code)?.value;
      if (value !== null && value !== undefined && !byLegalDong.has(member.area.legalDongCode ?? member.area.legalDongName)) {
        byLegalDong.set(member.area.legalDongCode ?? member.area.legalDongName, value);
      }
    }
    return byLegalDong.size === 2 ? [...byLegalDong.values()].reduce((sum, value) => sum + value, 0) / 2 : null;
  }
  if (code === "urban_regeneration_hub_count") {
    const byLegalDong = new Map<string, number>();
    for (const member of members) {
      const value = member.indicators.find((item) => item.code === code)?.value;
      if (value !== null && value !== undefined && !byLegalDong.has(member.area.legalDongCode ?? member.area.legalDongName)) {
        byLegalDong.set(member.area.legalDongCode ?? member.area.legalDongName, value);
      }
    }
    return byLegalDong.size === 2 ? [...byLegalDong.values()].reduce((sum, value) => sum + value, 0) : null;
  }
  if (code === "vacant_house_count") {
    const byLegalDong = new Map<string, number>();
    for (const member of members) {
      const value = member.indicators.find((item) => item.code === code)?.value;
      if (value !== null && value !== undefined && !byLegalDong.has(member.area.legalDongCode ?? member.area.legalDongName)) {
        byLegalDong.set(member.area.legalDongCode ?? member.area.legalDongName, value);
      }
    }
    return byLegalDong.size === 2 ? [...byLegalDong.values()].reduce((sum, value) => sum + value, 0) : null;
  }
  if (DISTRICT_PROXY_CODES.has(code)) return valuesFor(code, members)[0] ?? null;
  return null;
}

export function aggregateCompositeDashboard(members: DashboardData[], area: TargetArea) {
  const template = members[0];
  const indicators = template.indicators.map((base) => {
    const series: DashboardIndicator["series"] = [];
    const value = aggregateValue(base.code, members);
    const supported = value !== null || DISTRICT_PROXY_CODES.has(base.code);
    const indicator: DashboardIndicator = {
      ...base,
      value,
      previousValue: null,
      status: supported ? "success" : base.status === "restricted_data" ? "restricted_data" : "empty",
      statusMessage: supported
        ? ["street_floating_population_density", "residential_population_density", "workplace_population_density"].includes(base.code)
          ? `4개 행정동의 1ha당 ${base.name} 산술평균입니다. 면적가중 통합값이 아닙니다. ${COMPOSITE_NOTE}`
          : `${base.statusMessage ? `${base.statusMessage} ` : ""}${COMPOSITE_NOTE}`
        : `${COMPOSITE_NOTE}. 네 행정동 원자료의 분모 또는 동일 기준 집계근거가 없어 통합값을 임의 산출하지 않았습니다.`,
      geographicUnit: COMPOSITE_NOTE,
      series,
    };
    return { ...indicator, spatialComparison: comparisonFor(indicator, area) };
  });
  const completed = indicators.filter((indicator) => indicator.value !== null).length;
  const latest = members.map((member) => member.lastCollectedAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
  return {
    mode: template.mode,
    status: (completed === indicators.length ? "success" : completed > 0 ? "partial_success" : "empty") as DataStatus,
    lastCollectedAt: latest,
    area: {
      slug: area.slug,
      name: `${area.cityName} ${area.districtName} ${area.administrativeDongName}`,
      cityName: area.cityName,
      districtName: area.districtName,
      administrativeDongName: area.administrativeDongName,
      administrativeDongCode: area.administrativeDongCode,
      legalDongName: area.legalDongName,
      legalDongCode: area.legalDongCode,
      projectName: area.projectName,
      projectType: area.projectType,
      scope: area.scopeDescription,
    },
    indicators,
  };
}
