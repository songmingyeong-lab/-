import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runCollectionMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/collection/runner/run-collection", () => ({ runCollection: runCollectionMock }));

import { runScheduledCollection } from "@/app/api/cron/collect/route";

const successfulSummary = {
  mode: "live" as const,
  status: "success" as const,
  totalSources: 1,
  successfulSources: 1,
  failedSources: 0,
  savedRecords: 1,
  skippedRecords: 0,
  results: [{ sourceCode: "living-population", status: "success" as const, recordsRead: 1, recordsSaved: 1, recordsSkipped: 0, indicators: [], rawPayloads: [{ secret: "not returned" }] }],
};

describe("collection cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-value");
    runCollectionMock.mockResolvedValue(successfulSummary);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    runCollectionMock.mockReset();
  });

  it("rejects an invalid bearer token", async () => {
    const response = await runScheduledCollection(new Request("http://local.test/api/cron/collect"));
    expect(response.status).toBe(401);
    expect(runCollectionMock).not.toHaveBeenCalled();
  });

  it("runs due cycles and omits raw payloads from the response", async () => {
    const request = new Request("http://local.test/api/cron/collect", { headers: { authorization: "Bearer test-cron-secret-value" } });
    const response = await runScheduledCollection(request, new Date("2026-10-01T18:20:00Z"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(runCollectionMock).toHaveBeenCalledTimes(3);
    expect(runCollectionMock).toHaveBeenNthCalledWith(1, { mode: "live", area: "garibong", cycle: "daily" });
    expect(body.cycles).toEqual(["daily", "monthly", "quarterly"]);
    expect(body.summaries[0].results[0]).not.toHaveProperty("rawPayloads");
  });
});
