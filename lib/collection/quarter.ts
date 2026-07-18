export function recentQuarterCodes(date: Date, count = 8) {
  const currentQuarterIndex = date.getUTCFullYear() * 4 + Math.floor(date.getUTCMonth() / 3);
  return Array.from({ length: count }, (_, offset) => {
    const quarterIndex = currentQuarterIndex - offset - 1;
    return `${Math.floor(quarterIndex / 4)}${(quarterIndex % 4) + 1}`;
  });
}

export function quarterEndDate(quarterCode: string) {
  const year = quarterCode.slice(0, 4);
  const quarter = Number(quarterCode.slice(4));
  const month = String(quarter * 3).padStart(2, "0");
  const day = [1, 4].includes(quarter) ? "31" : "30";
  return `${year}-${month}-${day}`;
}
