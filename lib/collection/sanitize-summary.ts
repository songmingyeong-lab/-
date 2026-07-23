import type { AdapterResult } from "@/lib/collection/types";

export function sanitizeCollectionSummary<T extends { results: AdapterResult[] }>(summary: T) {
  return {
    ...summary,
    results: summary.results.map((result) => ({
      sourceCode: result.sourceCode,
      status: result.status,
      recordsRead: result.recordsRead,
      recordsSaved: result.recordsSaved,
      recordsSkipped: result.recordsSkipped,
      indicators: result.indicators,
      error: result.error,
    })),
  };
}
