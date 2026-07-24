import type { DashboardIndicator } from "@/lib/indicators/types";

export type CollectionCycle = "daily" | "monthly" | "quarterly";

export interface CollectionContext {
  areaSlug: string;
  cityName: string;
  districtName: string;
  administrativeDongCode: string;
  administrativeDongName: string;
  legalDongCode: string;
  legalDongName: string;
  /** @deprecated 행정동 이름 호환용. 새 코드는 administrativeDongName을 사용합니다. */
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
