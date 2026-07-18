import { z } from "zod";

const optionalString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional(),
);

const optionalAdminToken = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(16).optional(),
);

const envSchema = z.object({
  DATABASE_URL: optionalString,
  SEOUL_OPEN_API_KEY: optionalString,
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  SAVE_RAW_RESPONSES: z.enum(["true", "false"]).default("false"),
  COLLECTION_ADMIN_TOKEN: optionalAdminToken,
});

export function getEnvironment(modeOverride?: "mock" | "live") {
  const parsed = envSchema.parse(process.env);
  const mode = modeOverride ?? parsed.DATA_MODE;
  if (mode === "live" && !parsed.SEOUL_OPEN_API_KEY) {
    throw new Error("DATA_MODE=live에는 SEOUL_OPEN_API_KEY가 필요합니다.");
  }
  return { ...parsed, DATA_MODE: mode };
}
