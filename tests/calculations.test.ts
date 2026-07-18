import { describe, expect, it } from "vitest";
import { calculateChange, calculateChangeRate, interpretChange } from "@/lib/indicators/calculations";
import { calculateAgedBuildingRatio, isAgedBuilding } from "@/lib/indicators/building-age";

describe("indicator calculations", () => {
  it("calculates change and change rate", () => {
    expect(calculateChange(120, 100)).toBe(20);
    expect(calculateChangeRate(120, 100)).toBe(20);
  });
  it("does not divide by zero or replace null", () => {
    expect(calculateChangeRate(10, 0)).toBeNull();
    expect(calculateChange(null, 10)).toBeNull();
  });
  it("interprets favorable direction without assuming every increase is good", () => {
    expect(interpretChange(3, "LOWER_IS_BETTER")).toBe("악화 가능성");
    expect(interpretChange(-3, "LOWER_IS_BETTER")).toBe("개선 가능성");
    expect(interpretChange(3, "CONTEXT_DEPENDENT")).toBe("해석 주의");
  });
  it("calculates building age only from known approval dates", () => {
    const reference = new Date("2026-07-18T00:00:00Z");
    expect(isAgedBuilding(new Date("1996-07-18T00:00:00Z"), reference)).toBe(true);
    expect(isAgedBuilding(null, reference)).toBeNull();
    expect(calculateAgedBuildingRatio([true, false, null])).toBe(50);
    expect(calculateAgedBuildingRatio([null])).toBeNull();
  });
});
