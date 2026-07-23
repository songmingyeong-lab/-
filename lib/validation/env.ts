import { z } from "zod";

const optionalString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);

const optionalAdminToken = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(16).optional(),
);

const optionalPostgresUrl = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "postgres:" || protocol === "postgresql:";
    } catch {
      return false;
    }
  }, "PostgreSQL 연결 URL 형식이어야 합니다.").optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.url().optional(),
);

const envSchema = z.object({
  DATABASE_URL: optionalPostgresUrl,
  DIRECT_URL: optionalPostgresUrl,
  SUPABASE_URL: optionalHttpUrl,
  SUPABASE_PROJECT_ID: optionalString,
  SEOUL_OPEN_API_KEY: optionalString,
  PUBLIC_DATA_PORTAL_SERVICE_KEY: optionalString,
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  SAVE_RAW_RESPONSES: z.enum(["true", "false"]).default("false"),
  COLLECTION_ADMIN_TOKEN: optionalAdminToken,
  CRON_SECRET: optionalAdminToken,
});

export function getEnvironment(modeOverride?: "mock" | "live") {
  const parsed = envSchema.parse(process.env);
  const mode = modeOverride ?? parsed.DATA_MODE;
  if (mode === "live" && !parsed.DATABASE_URL) {
    throw new Error("DATA_MODE=live에는 DATABASE_URL이 필요합니다.");
  }
  if (mode === "live" && !parsed.SEOUL_OPEN_API_KEY) {
    throw new Error("DATA_MODE=live에는 SEOUL_OPEN_API_KEY가 필요합니다.");
  }
  return { ...parsed, DATA_MODE: mode };
}

export function getDatabaseUrl(purpose: "runtime" | "maintenance" = "runtime") {
  const parsed = envSchema.pick({ DATABASE_URL: true, DIRECT_URL: true }).parse(process.env);
  const value = purpose === "maintenance"
    ? parsed.DIRECT_URL ?? parsed.DATABASE_URL
    : parsed.DATABASE_URL;

  if (!value) {
    const required = purpose === "maintenance" ? "DIRECT_URL 또는 DATABASE_URL" : "DATABASE_URL";
    throw new Error(`${required}이 설정되지 않았습니다.`);
  }
  return value;
}
