import { describe, expect, it } from "vitest";
import { getScheduledCollectionCycles } from "@/lib/collection/schedule";

describe("scheduled collection cycles", () => {
  it("runs only daily collectors on an ordinary Seoul date", () => {
    expect(getScheduledCollectionCycles(new Date("2026-07-03T00:00:00Z"))).toEqual(["daily"]);
  });

  it("adds monthly collectors on the second day in Seoul", () => {
    expect(getScheduledCollectionCycles(new Date("2026-08-01T18:20:00Z"))).toEqual(["daily", "monthly"]);
  });

  it("adds quarterly collectors in January, April, July, and October", () => {
    expect(getScheduledCollectionCycles(new Date("2026-10-01T18:20:00Z"))).toEqual(["daily", "monthly", "quarterly"]);
  });
});
