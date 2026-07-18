export function isAgedBuilding(approvalDate: Date | null, referenceDate: Date, years = 30) {
  if (!approvalDate || Number.isNaN(approvalDate.getTime())) return null;
  const threshold = new Date(referenceDate);
  threshold.setFullYear(threshold.getFullYear() - years);
  return approvalDate <= threshold;
}

export function calculateAgedBuildingRatio(values: Array<boolean | null>) {
  const known = values.filter((value): value is boolean => value !== null);
  if (known.length === 0) return null;
  return (known.filter(Boolean).length / known.length) * 100;
}
