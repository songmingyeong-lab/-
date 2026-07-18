import type { FavorableDirection } from "./types";

export function calculateChange(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function calculateChangeRate(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function interpretChange(change: number | null, direction: FavorableDirection) {
  if (change === null || change === 0 || direction === "NEUTRAL") return "변화 관찰" as const;
  if (direction === "CONTEXT_DEPENDENT") return "해석 주의" as const;
  const improved = direction === "HIGHER_IS_BETTER" ? change > 0 : change < 0;
  return improved ? ("개선 가능성" as const) : ("악화 가능성" as const);
}
