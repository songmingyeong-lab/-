import "../envConfig";
import { runCollection } from "../lib/collection/runner/run-collection";
import { collectionTargetAreas } from "../lib/areas";

function argument(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.split("=").slice(1).join("=");
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const selectedArea = argument("area");
  const areaSlugs = selectedArea ? [selectedArea] : collectionTargetAreas.map((area) => area.slug);
  const summaries = [];
  for (const area of areaSlugs) {
    const summary = await runCollection({
      mode: argument("mode") as "mock" | "live" | undefined,
      source: argument("source"), indicator: argument("indicator"), area,
      cycle: argument("cycle") as "daily" | "monthly" | "quarterly" | undefined,
    });
    summaries.push({ area, ...summary });
  }
  console.log(JSON.stringify({ status: summaries.some((item) => item.status === "error") ? "error" : summaries.some((item) => item.status === "partial_success") ? "partial_success" : "success", areas: summaries }, (_key, value) => _key === "rawPayloads" ? undefined : value, 2));
  if (summaries.some((item) => item.status === "error")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "수집 실행 실패");
  process.exitCode = 1;
});
