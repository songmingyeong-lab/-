import "server-only";
import { getPrismaClient } from "./client";

// Application code must import this server-only facade, never expose Prisma
// through a client component or a NEXT_PUBLIC_* environment variable.
export const getPrisma = getPrismaClient;
