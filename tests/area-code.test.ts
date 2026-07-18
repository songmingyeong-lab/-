import { describe, expect, it } from "vitest";
import { assertAreaMatch, validateAreaCode } from "@/lib/validation/area-code";

describe("area codes", () => {
  it("keeps administrative and legal code formats separate", () => {
    expect(validateAreaCode("administrative", "11530595")).toBe(true);
    expect(validateAreaCode("administrative", "1153010300")).toBe(false);
    expect(validateAreaCode("legal", "1153010300")).toBe(true);
  });
  it("requires both code and name to match", () => {
    expect(() => assertAreaMatch("11530595", "가리봉동", "11530595", "구로동")).toThrow("불일치");
  });
});
