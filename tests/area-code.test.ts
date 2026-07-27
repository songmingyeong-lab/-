import { describe, expect, it } from "vitest";
import { assertAreaMatch, validateAreaCode } from "@/lib/validation/area-code";
import { collectionTargetAreas, compositeTargetArea } from "@/lib/areas";

describe("area codes", () => {
  it("keeps administrative and legal code formats separate", () => {
    expect(validateAreaCode("administrative", "11530595")).toBe(true);
    expect(validateAreaCode("administrative", "1153010300")).toBe(false);
    expect(validateAreaCode("legal", "1153010300")).toBe(true);
  });
  it("requires both code and name to match", () => {
    expect(() => assertAreaMatch("11530595", "가리봉동", "11530595", "구로동")).toThrow("불일치");
  });
  it("configures all five target administrative dongs with separate legal-dong codes", () => {
    expect(collectionTargetAreas.map((area) => [area.slug, area.administrativeDongCode, area.legalDongCode])).toEqual([
      ["garibong", "11530595", "1153010300"],
      ["changsin-1", "11110670", "1111017400"],
      ["changsin-2", "11110680", "1111017400"],
      ["changsin-3", "11110690", "1111017400"],
      ["sungin-1", "11110700", "1111017500"],
    ]);
    expect(compositeTargetArea.memberAreaSlugs).toEqual(["changsin-1", "changsin-2", "changsin-3", "sungin-1"]);
  });
});
