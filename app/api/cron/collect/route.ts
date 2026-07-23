import { runCollection } from "@/lib/collection/runner/run-collection";
import { sanitizeCollectionSummary } from "@/lib/collection/sanitize-summary";
import { getScheduledCollectionCycles } from "@/lib/collection/schedule";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function runScheduledCollection(request: Request, now = new Date()) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ status: "error", error: "CRON_SECRET이 설정되지 않았습니다." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ status: "error", error: "권한이 없습니다." }, { status: 401 });
  }

  const cycles = getScheduledCollectionCycles(now);
  const summaries = [];
  for (const cycle of cycles) {
    const summary = await runCollection({ mode: "live", area: "garibong", cycle });
    summaries.push({ cycle, ...sanitizeCollectionSummary(summary) });
  }

  const failed = summaries.some((summary) => summary.status === "error");
  return Response.json(
    { status: failed ? "error" : "success", executedAt: now.toISOString(), cycles, summaries },
    { status: failed ? 502 : 200 },
  );
}

export async function GET(request: Request) {
  return runScheduledCollection(request);
}
