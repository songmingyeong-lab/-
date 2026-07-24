import areas from "@/data/target-areas.json";

export const targetAreas = areas;
export type TargetArea = (typeof targetAreas)[number];
export type TargetAreaSlug = TargetArea["slug"];

export const DEFAULT_AREA_SLUG = "garibong";

export function getTargetArea(slug?: string | null) {
  return targetAreas.find((area) => area.slug === slug);
}

export function resolveTargetArea(slug?: string | null) {
  return getTargetArea(slug) ?? getTargetArea(DEFAULT_AREA_SLUG)!;
}

export function isTargetAreaSlug(slug: string): slug is TargetAreaSlug {
  return Boolean(getTargetArea(slug));
}
