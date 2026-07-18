import areas from "@/data/target-areas.json";
import { getMockDashboardData } from "@/lib/dashboard-data";
import { sourceAdapters } from "@/lib/collection/adapters";
import { persistAdapterResult } from "@/lib/collection/runner/persist-result";
import type { AdapterResult, CollectionCycle } from "@/lib/collection/types";
import { getEnvironment } from "@/lib/validation/env";

interface RunOptions {
  mode?: "mock" | "live";
  source?: string;
  indicator?: string;
  area?: string;
  cycle?: CollectionCycle;
}

const indicatorSources: Record<string, string> = {
  living_population: "living-population",
  aged_building_ratio: "building-register",
  store_count: "commercial-store",
  floating_population: "floating-population",
};

export async function runCollection(options: RunOptions = {}) {
  const environment = getEnvironment(options.mode);
  const area = areas.find((item) => item.slug === (options.area ?? "garibong"));
  if (!area) throw new Error(`지원하지 않는 지역입니다: ${options.area}`);

  if (environment.DATA_MODE === "mock") {
    const dashboard = getMockDashboardData();
    const indicators = options.indicator ? dashboard.indicators.filter((item) => item.code === options.indicator) : dashboard.indicators;
    const results: AdapterResult[] = indicators.map((item) => ({ sourceCode: indicatorSources[item.code], status: item.status === "empty" ? "empty" : "success", recordsRead: item.series.length, recordsSaved: item.value === null ? 0 : 1, recordsSkipped: 0, indicators: [item] }));
    if (environment.DATABASE_URL) {
      for (const result of results) await persistAdapterResult(area.slug, result, environment.SAVE_RAW_RESPONSES === "true");
    }
    return summarize(results, "mock");
  }

  const selected = sourceAdapters.filter((adapter) => (!options.source || adapter.code === options.source) && (!options.indicator || adapter.code === indicatorSources[options.indicator]) && (!options.cycle || adapter.cycle === options.cycle));
  const results: AdapterResult[] = [];
  for (const adapter of selected) {
    try {
      const result = await adapter.collect({ areaSlug: area.slug, administrativeDongCode: area.administrativeDongCode, legalDongCode: area.legalDongCode, dongName: area.dongName, apiKey: environment.SEOUL_OPEN_API_KEY!, now: new Date() });
      if (!environment.DATABASE_URL) throw new Error("live 수집 결과를 반영하려면 DATABASE_URL이 필요합니다.");
      await persistAdapterResult(area.slug, result, environment.SAVE_RAW_RESPONSES === "true");
      results.push(result);
    } catch (error) {
      results.push({ sourceCode: adapter.code, status: "error", recordsRead: 0, recordsSaved: 0, recordsSkipped: 0, indicators: [], error: error instanceof Error ? error.message : "알 수 없는 오류" });
    }
  }
  return summarize(results, "live");
}

function summarize(results: AdapterResult[], mode: "mock" | "live") {
  const success = results.filter((item) => item.status === "success").length;
  const failures = results.filter((item) => item.status === "error").length;
  const incomplete = results.some((item) => item.status !== "success");
  return {
    mode, status: failures === results.length && results.length > 0 ? "error" : incomplete ? "partial_success" : "success",
    totalSources: results.length, successfulSources: success, failedSources: failures,
    savedRecords: results.reduce((sum, item) => sum + item.recordsSaved, 0), skippedRecords: results.reduce((sum, item) => sum + item.recordsSkipped, 0), results,
  } as const;
}
