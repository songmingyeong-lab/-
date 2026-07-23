import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";

config({ path: ".env.local", quiet: true });

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "true";
let disconnect: (() => Promise<void>) | undefined;

describe.skipIf(!enabled)("Supabase PostgreSQL connection", () => {
  afterAll(async () => disconnect?.());

  it("runs a read-only query", async () => {
    const { getPrismaClient } = await import("@/lib/db/client");
    const prisma = getPrismaClient();
    disconnect = () => prisma.$disconnect();
    const rows = await prisma.$queryRaw<Array<{ connected: number }>>`SELECT 1 AS connected`;
    expect(rows[0]?.connected).toBe(1);
  });
});
