import fixture from "@/data/fixtures/dashboard.json";
import type { DashboardData, DashboardIndicator, DataStatus } from "@/lib/indicators/types";

export function getMockDashboardData(): DashboardData {
  return structuredClone(fixture) as DashboardData;
}

function liveErrorData(message: string): DashboardData {
  const data = getMockDashboardData();
  return {
    ...data, mode: "live", status: "error", lastCollectedAt: null,
    indicators: data.indicators.map((item) => ({ ...item, value: null, previousValue: null, baseDate: null, status: "error", series: [], proxyDescription: `${item.proxyDescription} (${message})` })),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if ((process.env.DATA_MODE ?? "mock") === "mock") return getMockDashboardData();
  if (!process.env.DATABASE_URL) return liveErrorData("DATABASE_URL이 설정되지 않았습니다.");
  try {
    const { getPrisma } = await import("@/lib/db/prisma");
    const prisma = getPrisma();
    const area = await prisma.area.findUnique({ where: { slug: "garibong" } });
    if (!area) return liveErrorData("DB seed가 필요합니다.");
    const definitions = await prisma.indicatorDefinition.findMany({ where: { active: true }, include: { source: true, observations: { where: { areaId: area.id }, orderBy: { baseDate: "desc" }, take: 12 } } });
    const indicators: DashboardIndicator[] = definitions.map((definition) => {
      const [latest, previous] = definition.observations;
      const metadata = latest?.metadata as { series?: DashboardIndicator["series"] } | null;
      return {
        code: definition.code, name: definition.name, category: definition.category, value: latest?.value === null || latest?.value === undefined ? null : Number(latest.value),
        previousValue: previous?.value === null || previous?.value === undefined ? null : Number(previous.value), unit: definition.unit,
        baseDate: latest?.baseDate.toISOString().slice(0, 10) ?? null, comparisonLabel: definition.comparisonPeriod,
        favorableDirection: definition.favorableDirection, status: latest ? latest.status.toLowerCase() as DataStatus : "empty",
        source: definition.source.name, sourceUrl: definition.source.sourceUrl, geographicUnit: definition.geographicUnit,
        proxyDescription: definition.proxyDescription,
        series: metadata?.series ?? [...definition.observations].reverse().map((observation) => ({ date: observation.baseDate.toISOString().slice(0, 10), value: observation.value === null ? null : Number(observation.value) })),
      };
    });
    const lastCollectedAt = definitions.flatMap((item) => item.observations).map((item) => item.collectedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      mode: "live", status: indicators.some((item) => item.status === "error") ? "partial_success" : "success", lastCollectedAt: lastCollectedAt?.toISOString() ?? null,
      area: { slug: area.slug, name: `${area.cityName} ${area.districtName} ${area.dongName}`, districtName: area.districtName, projectName: area.projectName ?? "확인 필요", projectPeriod: `${area.projectStartDate?.getFullYear() ?? "-"}~${area.projectEndDate?.getFullYear() ?? "-"} (연도 단위)`, projectType: area.projectType ?? "확인 필요", scope: "가리봉동 행정동 전체" },
      indicators,
    };
  } catch (error) {
    return liveErrorData(error instanceof Error ? error.message : "DB 조회 실패");
  }
}
