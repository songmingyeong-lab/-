import type { CollectionCycle } from "@/lib/collection/types";

function seoulDateParts(now: Date) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((item) => item.type === type)?.value);
  return { month: part("month"), day: part("day") };
}

export function getScheduledCollectionCycles(now: Date): CollectionCycle[] {
  const { month, day } = seoulDateParts(now);
  const cycles: CollectionCycle[] = ["daily"];
  if (day === 2) cycles.push("monthly");
  if (day === 2 && [1, 4, 7, 10].includes(month)) cycles.push("quarterly");
  return cycles;
}
