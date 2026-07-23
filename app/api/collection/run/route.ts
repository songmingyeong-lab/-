import { z } from "zod";
import { runCollection } from "@/lib/collection/runner/run-collection";
import { sanitizeCollectionSummary } from "@/lib/collection/sanitize-summary";

const bodySchema = z.object({
  mode: z.enum(["mock", "live"]).optional(),
  source: z.string().optional(),
  indicator: z.string().optional(),
  cycle: z.enum(["daily", "monthly", "quarterly"]).optional(),
  area: z.literal("garibong").default("garibong"),
});

export async function POST(request: Request) {
  const configuredToken = process.env.COLLECTION_ADMIN_TOKEN;
  if (!configuredToken) return Response.json({ status: "error", error: "수집 실행 API가 비활성화되어 있습니다." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${configuredToken}`) return Response.json({ status: "error", error: "권한이 없습니다." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ status: "error", error: parsed.error.flatten() }, { status: 400 });
  const summary = await runCollection(parsed.data);
  return Response.json(sanitizeCollectionSummary(summary), { status: summary.status === "error" ? 502 : 200 });
}
