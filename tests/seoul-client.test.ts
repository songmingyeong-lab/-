import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchSeoulPage, SeoulApiError } from "@/lib/api/seoul-client";

const rowSchema = z.object({ VALUE: z.coerce.number() });

describe("Seoul API client", () => {
  it("validates RESULT and rows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ TestService: { list_total_count: 1, RESULT: { CODE: "INFO-000", MESSAGE: "정상" }, row: [{ VALUE: "12" }] } }), { status: 200 }));
    const result = await fetchSeoulPage("https://example.test", "TestService", rowSchema, { fetchImpl, retries: 1 });
    expect(result.rows[0].VALUE).toBe(12);
  });
  it("returns empty only for INFO-200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ TestService: { RESULT: { CODE: "INFO-200", MESSAGE: "자료 없음" } } }), { status: 200 }));
    expect((await fetchSeoulPage("https://example.test", "TestService", rowSchema, { fetchImpl, retries: 1 })).rows).toEqual([]);
  });
  it("returns empty when INFO-200 is provided at the top level", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } }), { status: 200 }));
    expect((await fetchSeoulPage("https://example.test", "TestService", rowSchema, { fetchImpl, retries: 1 })).rows).toEqual([]);
  });
  it("retries HTTP failures and eventually throws", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("fail", { status: 503 }));
    await expect(fetchSeoulPage("https://example.test", "TestService", rowSchema, { fetchImpl, retries: 2 })).rejects.toBeInstanceOf(SeoulApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
