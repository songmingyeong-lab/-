import type { DashboardIndicator } from "@/lib/indicators/types";

export type CollectionCycle = "daily" | "monthly" | "quarterly";

export interface CollectionContext {
  areaSlug: string;
  administrativeDongCode: string;
  legalDongCode: string;
  dongName: string;
  apiKey: string;
  now: Date;
}

export interface AdapterResult {
  sourceCode: string;
  status: "success" | "empty" | "error";
  recordsRead: number;
  recordsSaved: number;
  recordsSkipped: number;
  indicators: DashboardIndicator[];
  rawPayloads?: unknown[];
  error?: string;
}

export interface SourceAdapter {
  code: string;
  cycle: CollectionCycle;
  collect(context: CollectionContext): Promise<AdapterResult>;
}
