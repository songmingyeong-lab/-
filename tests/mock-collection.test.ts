import { afterEach, describe, expect, it } from "vitest";
import { runCollection } from "@/lib/collection/runner/run-collection";

describe("mock collection", () => {
  afterEach(() => { delete process.env.DATABASE_URL; });
  it("runs without an API key and preserves unavailable indicators", async () => {
    const result = await runCollection({ mode: "mock", area: "garibong" });
    expect(result.status).toBe("partial_success");
    expect(result.totalSources).toBe(14);
    expect(result.results.find((item) => item.sourceCode === "vacant-house")?.status).toBe("empty");
  });
});
