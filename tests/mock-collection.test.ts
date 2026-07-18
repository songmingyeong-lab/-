import { afterEach, describe, expect, it } from "vitest";
import { runCollection } from "@/lib/collection/runner/run-collection";

describe("mock collection", () => {
  afterEach(() => { delete process.env.DATABASE_URL; });
  it("runs without an API key and preserves the empty building indicator", async () => {
    const result = await runCollection({ mode: "mock", area: "garibong" });
    expect(result.status).toBe("partial_success");
    expect(result.totalSources).toBe(4);
    expect(result.results.find((item) => item.sourceCode === "building-register")?.status).toBe("empty");
  });
});
