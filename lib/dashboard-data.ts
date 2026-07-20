import fixture from "@/data/fixtures/dashboard.json";
import type { DashboardData, DashboardIndicator, DataStatus, IndicatorArea } from "@/lib/indicators/types";
import { calculateDashboardScores } from "@/lib/scoring/dashboard-scores";
import { SCORING_NOTICE, SCORING_VERSION } from "@/lib/scoring/indicator-score-config";

const areaLabels: Record<string, IndicatorArea> = {
  HOUSING_ENVIRONMENT: "주거환경",
  LIVING_INCONVENIENCE: "생활 불편",
  COMMERCIAL_CHANGE: "상권 변화",
  VITALITY_CONGESTION: "활력·혼잡",
  COMMUNITY_HUB: "공동체·거점",
};

export function getMockDashboardData(): DashboardData {
  const data = structuredClone(fixture) as Omit<DashboardData, "categoryScores" | "scoringVersion" | "scoringNotice">;
  return attachScores(data);
}

function attachScores(
  data: Omit<DashboardData, "categoryScores" | "scoringVersion" | "scoringNotice">,
): DashboardData {
  const targetDongCode = data.area.administrativeDongCode;
  const targetDistrictCode = targetDongCode?.slice(0, 5) ?? null;
  return {
    ...data,
    categoryScores: calculateDashboardScores(data.indicators, { targetDongCode, targetDistrictCode }),
    scoringVersion: SCORING_VERSION,
    scoringNotice: SCORING_NOTICE,
  };
}

function liveErrorData(message: string): DashboardData {
  const data = getMockDashboardData();
  return attachScores({
    ...data, mode: "live", status: "error", lastCollectedAt: null,
    indicators: data.indicators.map((item) => ({ ...item, value: null, previousValue: null, baseDate: null, collectedAt: null, status: "error", statusMessage: message, series: [] })),
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  if ((process.env.DATA_MODE ?? "mock") === "mock") return getMockDashboardData();
  if (!process.env.DATABASE_URL) return liveErrorData("DATABASE_URL이 설정되지 않았습니다.");
  try {
    const { getPrisma } = await import("@/lib/db/prisma");
    const prisma = getPrisma();
    const area = await prisma.area.findUnique({ where: { slug: "garibong" } });
    if (!area) return liveErrorData("DB seed가 필요합니다.");
    const definitions = await prisma.indicatorDefinition.findMany({ where: { active: true }, include: { source: true, observations: { where: { areaId: area.id }, orderBy: { baseDate: "desc" }, take: 400 } } });
    const snapshotByCode = new Map(getMockDashboardData().indicators.map((indicator) => [indicator.code, indicator]));
    const indicators: DashboardIndicator[] = definitions.map((definition) => {
      const [latest, previous] = definition.observations;
      const snapshot = snapshotByCode.get(definition.code);
      if (!latest && snapshot) {
        return {
          ...snapshot,
          name: definition.name,
          area: areaLabels[definition.areaGroup],
          proxyDescription: definition.proxyDescription,
        };
      }
      const metadata = latest?.metadata as { series?: DashboardIndicator["series"]; statusMessage?: string | null; spatialComparison?: DashboardIndicator["spatialComparison"] } | null;
      const storedStatus = latest ? latest.status.toLowerCase() as DataStatus : definition.defaultStatus.toLowerCase() as DataStatus;
      const staleAt = latest ? new Date(latest.baseDate.getTime() + definition.staleAfterDays * 86_400_000) : null;
      const status = storedStatus === "success" && staleAt && staleAt < new Date() ? "stale" : storedStatus;
      return {
        code: definition.code, name: definition.name, area: areaLabels[definition.areaGroup], value: latest?.value === null || latest?.value === undefined ? null : Number(latest.value),
        previousValue: previous?.value === null || previous?.value === undefined ? null : Number(previous.value), unit: definition.unit,
        baseDate: latest?.baseDate.toISOString().slice(0, 10) ?? null, comparisonLabel: definition.comparisonPeriod,
        favorableDirection: definition.favorableDirection, status,
        source: definition.source.name, sourceUrl: definition.source.sourceUrl, geographicUnit: latest?.geographicUnit ?? definition.geographicUnit,
        collectedAt: latest?.collectedAt.toISOString() ?? null, updateCycle: definition.source.updateCycle, statusMessage: metadata?.statusMessage ?? latest?.errorMessage ?? definition.statusMessage,
        proxyDescription: definition.proxyDescription,
        series: metadata?.series ?? [...definition.observations].reverse().map((observation) => ({ date: observation.baseDate.toISOString().slice(0, 10), value: observation.value === null ? null : Number(observation.value) })),
        spatialComparison: metadata?.spatialComparison,
      };
    });
    const observedAt = definitions.flatMap((item) => item.observations).map((item) => item.collectedAt).sort((a, b) => b.getTime() - a.getTime())[0];
    const snapshotAt = indicators
      .filter((indicator) => snapshotByCode.has(indicator.code) && indicator.collectedAt)
      .map((indicator) => new Date(indicator.collectedAt as string))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const lastCollectedAt = [observedAt, snapshotAt].filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const completeStatuses: DataStatus[] = ["success", "stale", "mock"];
    const completed = indicators.filter((item) => completeStatuses.includes(item.status)).length;
    const status: DataStatus = indicators.length === 0 ? "empty" : completed === indicators.length ? "success" : completed > 0 ? "partial_success" : indicators.every((item) => item.status === "empty") ? "empty" : "partial_success";
    return attachScores({
      mode: "live", status, lastCollectedAt: lastCollectedAt?.toISOString() ?? null,
      area: {
        slug: area.slug, name: `${area.cityName} ${area.districtName} ${area.administrativeDongName ?? area.dongName}`, districtName: area.districtName,
        administrativeDongName: area.administrativeDongName ?? area.dongName, administrativeDongCode: area.administrativeDongCode,
        legalDongName: area.legalDongName ?? area.dongName, legalDongCode: area.legalDongCode,
        projectName: area.projectName ?? "확인 필요", projectType: area.projectType ?? "확인 필요", scope: "가리봉동 행정동 전체",
      },
      indicators,
    });
  } catch (error) {
    return liveErrorData(error instanceof Error ? error.message : "DB 조회 실패");
  }
}
