import "../envConfig";
import { runCollection } from "../lib/collection/runner/run-collection";

function argument(name: string) {
  const direct = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (direct) return direct.split("=").slice(1).join("=");
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const summary = await runCollection({
    mode: argument("mode") as "mock" | "live" | undefined,
    source: argument("source"), indicator: argument("indicator"), area: argument("area"),
    cycle: argument("cycle") as "daily" | "monthly" | "quarterly" | undefined,
  });
  console.log(JSON.stringify(summary, (_key, value) => _key === "rawPayloads" ? undefined : value, 2));
  if (summary.status === "error") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "수집 실행 실패");
  process.exitCode = 1;
});
