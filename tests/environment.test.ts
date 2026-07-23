import { afterEach, describe, expect, it, vi } from "vitest";
import { getDatabaseUrl, getEnvironment } from "@/lib/validation/env";

describe("environment validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps mock mode usable without PostgreSQL or API credentials", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("SEOUL_OPEN_API_KEY", "");
    expect(getEnvironment("mock").DATA_MODE).toBe("mock");
  });

  it("requires a runtime database connection in live mode", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SEOUL_OPEN_API_KEY", "test-api-key");
    expect(() => getEnvironment("live")).toThrow("DATABASE_URL");
  });

  it("rejects non-PostgreSQL connection strings", () => {
    vi.stubEnv("DATABASE_URL", "https://example.supabase.co");
    expect(() => getDatabaseUrl()).toThrow("PostgreSQL");
  });

  it("prefers DIRECT_URL for migrations and seed", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://runtime:secret@localhost:6543/postgres");
    vi.stubEnv("DIRECT_URL", "postgresql://maintenance:secret@localhost:5432/postgres");
    expect(getDatabaseUrl("maintenance")).toContain("maintenance");
  });

  it("rejects a short cron secret", () => {
    vi.stubEnv("CRON_SECRET", "short");
    expect(() => getEnvironment("mock")).toThrow();
  });
});
