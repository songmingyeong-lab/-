import fixture from "@/data/fixtures/dashboard.json";
import { DEFAULT_AREA_SLUG, resolveTargetArea } from "@/lib/areas";
import type { DashboardData, DashboardIndicator, DataStatus, IndicatorArea } from "@/lib/indicators/types";
import { calculateDashboardScores } from "@/lib/scoring/dashboard-scores";
import { evaluateDistrictComparison } from "@/lib/scoring/comparison-availability";
import { SCORING_NOTICE, SCORING_VERSION } from "@/lib/scoring/indicator-score-config";
import { aggregateCompositeDashboard } from "@/lib/composite-dashboard";

const areaLabels: Record<string, IndicatorArea> = {
  HOUSING_ENVIRONMENT: "주거환경",
  LIVING_INCONVENIENCE: "생활 불편",
  COMMERCIAL_CHANGE: "상권 변화",
  VITALITY_CONGESTION: "활력·혼잡",
  COMMUNITY_HUB: "공동체·거점",
};
const RECOVERED_CONDITION_SEARCH_CODES = new Set(["monthly_average_income", "income_level", "rent_level"]);

function formatSeoulDate(value: Date) {
  return new Date(value.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function configuredArea(slug?: string | null): DashboardData["area"] {
  const area = resolveTargetArea(slug);
  return {
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
  };
}

function attachScores(
  data: Omit<DashboardData, "comparisonAvailability" | "categoryScores" | "scoringVersion" | "scoringNotice">,
): DashboardData {
  const targetDongCode = data.area.administrativeDongCode;
  const targetDistrictCode = targetDongCode?.slice(0, 5) ?? null;
  return {
    ...data,
    comparisonAvailability: evaluateDistrictComparison(
      data.indicators.find((indicator) => indicator.code === "store_count"),
      data.area.districtName,
      targetDistrictCode,
    ),
    categoryScores: calculateDashboardScores(data.indicators, {
      targetDongCode,
      targetDistrictCode,
      targetDongName: data.area.administrativeDongName,
      targetDistrictName: data.area.districtName,
    }),
    scoringVersion: SCORING_VERSION,
    scoringNotice: SCORING_NOTICE,
  };
}

function modernizeFixtureIndicators(indicators: DashboardIndicator[]) {
  const store = indicators.find((item) => item.code === "store_count")!;
  const floating = indicators.find((item) => item.code === "floating_population")!;
  const missing = (
    base: DashboardIndicator,
    code: string,
    name: string,
    unit: string,
    statusMessage: string,
    status: DataStatus = "empty",
  ): DashboardIndicator => ({
    ...base, code, name, value: null, previousValue: null, unit, status, statusMessage, series: [], spatialComparison: undefined,
  });
  return [
    ...indicators.filter((item) => !["living_population", "floating_population", "peak_floating_time_band"].includes(item.code)),
    missing(store, "store_density", "1,000가구당 점포 수", "개/1,000가구", "확인 스냅샷에는 같은 분기의 가구 수가 없어 점포 밀도 대체값을 계산하지 않았습니다."),
    missing(store, "opening_count", "개업 점포 수", "개", "확인 스냅샷에 개업 점포 수 원자료가 없습니다."),
    missing(store, "closing_count", "폐업 점포 수", "개", "확인 스냅샷에 폐업 점포 수 원자료가 없습니다."),
    missing(store, "monthly_average_income", "월평균 소득", "원/월", "확인 스냅샷에는 조건검색 소득구간이 없습니다. live 모드에서 최신 조건검색 값을 수집합니다."),
    missing(store, "income_level", "소득분위", "분위", "확인 스냅샷에는 조건검색 소득분위가 없습니다. live 모드에서 최신 조건검색 값을 수집합니다."),
    missing(store, "household_count", "가구 수", "가구", "확인 스냅샷에 같은 기준분기의 가구 수가 없습니다."),
    missing(store, "rental_burden", "임대료 부담", "%", "행정동 상가 임대시세와 호환 가능한 매출 자료가 모두 필요합니다."),
    missing(store, "rent_level", "상가 환산임대료", "원/3.3㎡·월", "확인 스냅샷에는 조건검색 임대시세가 없습니다. live 모드에서 최신 조건검색 값을 수집합니다."),
    missing(
      floating,
      "street_floating_population_density",
      "길 단위 유동인구",
      "명/ha",
      "확인 스냅샷의 기존 유동인구는 공식 1ha당 값과 단위가 달라 재사용하지 않습니다. live 모드에서 서울시 상권분석서비스 조건검색 값을 수집합니다.",
    ),
    missing(
      floating,
      "residential_population_density",
      "주거인구",
      "명/ha",
      "확인 스냅샷에 공식 1ha당 주거인구가 없습니다. live 모드에서 서울시 상권분석서비스 조건검색 값을 수집합니다.",
    ),
    missing(
      floating,
      "workplace_population_density",
      "직장인구",
      "명/ha",
      "확인 스냅샷에 공식 1ha당 직장인구가 없습니다. live 모드에서 서울시 상권분석서비스 조건검색 값을 수집합니다.",
    ),
  ];
}

export function getMockDashboardData(areaSlug = DEFAULT_AREA_SLUG): DashboardData {
  const selectedArea = configuredArea(areaSlug);
  const data = structuredClone(fixture) as Omit<DashboardData, "categoryScores" | "scoringVersion" | "scoringNotice">;
  data.indicators = modernizeFixtureIndicators(data.indicators);
  if (selectedArea.slug === DEFAULT_AREA_SLUG) return attachScores({ ...data, area: selectedArea });
  return attachScores({
    ...data,
    area: selectedArea,
    lastCollectedAt: null,
    status: "empty",
    indicators: data.indicators.map((indicator) => ({
      ...indicator,
      value: null,
      previousValue: null,
      baseDate: null,
      collectedAt: null,
      status: "empty",
      statusMessage: `${selectedArea.administrativeDongName}의 mock 스냅샷은 없습니다. live 모드에서 초기 수집을 실행하세요.`,
      series: [],
      spatialComparison: undefined,
    })),
  });
}

function liveErrorData(message: string, areaSlug?: string): DashboardData {
  const data = getMockDashboardData(areaSlug);
  return attachScores({
    ...data,
    mode: "live",
    status: "error",
    lastCollectedAt: null,
    indicators: data.indicators.map((item) => ({
      ...item,
      value: null,
      previousValue: null,
      baseDate: null,
      collectedAt: null,
      status: "error",
      statusMessage: message,
      series: [],
      spatialComparison: undefined,
    })),
  });
}

export async function getDashboardData(areaSlug = DEFAULT_AREA_SLUG): Promise<DashboardData> {
  const selected = resolveTargetArea(areaSlug);
  if (selected.memberAreaSlugs?.length) {
    const members = await Promise.all(selected.memberAreaSlugs.map((slug) => getDashboardData(slug)));
    return attachScores(aggregateCompositeDashboard(members, selected));
  }
  if ((process.env.DATA_MODE ?? "mock") === "mock") return getMockDashboardData(areaSlug);
  if (!process.env.DATABASE_URL) return liveErrorData("DATABASE_URL이 설정되지 않았습니다.", areaSlug);
  try {
    const { getPrisma } = await import("@/lib/db/prisma");
    const prisma = getPrisma();
    const area = await prisma.area.findUnique({ where: { slug: areaSlug } });
    if (!area) return liveErrorData(`${areaSlug} 지역이 DB에 없습니다. npm run db:seed를 실행하세요.`, areaSlug);
    const definitions = await prisma.indicatorDefinition.findMany({
      where: { active: true },
      include: { source: true, observations: { where: { areaId: area.id }, orderBy: { baseDate: "desc" }, take: 400 } },
    });
    const indicators: DashboardIndicator[] = definitions.map((definition) => {
      const successfulObservations = definition.observations.filter((observation) =>
        observation.status === "SUCCESS" && observation.value !== null
      );
      const displayObservations = RECOVERED_CONDITION_SEARCH_CODES.has(definition.code) && successfulObservations.length > 0
        ? successfulObservations
        : definition.observations;
      const [latest, previous] = displayObservations;
      const metadata = latest?.metadata as { series?: DashboardIndicator["series"]; statusMessage?: string | null; spatialComparison?: DashboardIndicator["spatialComparison"] } | null;
      const storedStatus = latest ? latest.status.toLowerCase() as DataStatus : definition.defaultStatus.toLowerCase() as DataStatus;
      const staleAt = latest ? new Date(latest.baseDate.getTime() + definition.staleAfterDays * 86_400_000) : null;
      const status = storedStatus === "success" && staleAt && staleAt < new Date() ? "stale" : storedStatus;
      return {
        code: definition.code,
        name: definition.name,
        area: areaLabels[definition.areaGroup],
        value: latest?.value === null || latest?.value === undefined ? null : Number(latest.value),
        previousValue: previous?.value === null || previous?.value === undefined ? null : Number(previous.value),
        unit: definition.unit,
        baseDate: latest ? formatSeoulDate(latest.baseDate) : null,
        comparisonLabel: definition.comparisonPeriod,
        favorableDirection: definition.favorableDirection,
        status,
        source: definition.source.name,
        sourceUrl: definition.source.sourceUrl,
        geographicUnit: latest?.geographicUnit ?? definition.geographicUnit,
        collectedAt: latest?.collectedAt.toISOString() ?? null,
        updateCycle: definition.source.updateCycle,
        statusMessage: metadata?.statusMessage ?? latest?.errorMessage ?? definition.statusMessage,
        proxyDescription: definition.code === "store_count"
          ? "같은 자치구 내 점포 수 백분위를 1~5점으로 환산한 상권 규모 참고지표이며, 높고 낮음 자체가 상권의 질이나 성과를 뜻하지 않습니다."
          : definition.proxyDescription,
        series: metadata?.series ?? [...definition.observations].reverse().map((observation) => ({
          date: formatSeoulDate(observation.baseDate),
          value: observation.value === null ? null : Number(observation.value),
        })),
        spatialComparison: metadata?.spatialComparison,
      };
    });
    const observedAt = definitions.flatMap((item) => item.observations).map((item) => item.collectedAt).sort((a, b) => b.getTime() - a.getTime())[0];
    const completeStatuses: DataStatus[] = ["success", "stale", "mock"];
    const completed = indicators.filter((item) => completeStatuses.includes(item.status)).length;
    const status: DataStatus = indicators.length === 0
      ? "empty"
      : completed === indicators.length
        ? "success"
        : completed > 0
          ? "partial_success"
          : indicators.every((item) => item.status === "empty")
            ? "empty"
            : "partial_success";
    const target = resolveTargetArea(area.slug);
    return attachScores({
      mode: "live",
      status,
      lastCollectedAt: observedAt?.toISOString() ?? null,
      area: {
        slug: area.slug,
        name: `${area.cityName} ${area.districtName} ${area.administrativeDongName ?? area.dongName}`,
        cityName: area.cityName,
        districtName: area.districtName,
        administrativeDongName: area.administrativeDongName ?? area.dongName,
        administrativeDongCode: area.administrativeDongCode,
        legalDongName: area.legalDongName ?? area.dongName,
        legalDongCode: area.legalDongCode,
        projectName: area.projectName ?? "확인 필요",
        projectType: area.projectType ?? "확인 필요",
        scope: target.scopeDescription,
      },
      indicators,
    });
  } catch (error) {
    return liveErrorData(error instanceof Error ? error.message : "DB 조회 실패", areaSlug);
  }
}
