import { z } from "zod";

const resultSchema = z.object({
  CODE: z.string(),
  MESSAGE: z.string().optional(),
});

export class SeoulApiError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "SeoulApiError";
  }
}

interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
}

export function buildSeoulUrl(
  apiKey: string,
  service: string,
  start: number,
  end: number,
  parameters: string[] = [],
) {
  const parts = [apiKey, "json", service, String(start), String(end), ...parameters];
  return `http://openapi.seoul.go.kr:8088/${parts.map(encodeURIComponent).join("/")}`;
}

export async function fetchSeoulPage<T>(
  url: string,
  service: string,
  rowSchema: z.ZodType<T>,
  options: FetchOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = options.retries ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
        cache: "no-store",
      });
      if (!response.ok) throw new SeoulApiError(`서울 API HTTP ${response.status}`);
      const payload = (await response.json()) as Record<string, unknown>;
      const envelope = payload[service];
      if (!envelope || typeof envelope !== "object") {
        const error = resultSchema.safeParse(payload.RESULT);
        throw new SeoulApiError(error.success ? error.data.MESSAGE ?? error.data.CODE : "응답 서비스 키가 없습니다.", error.success ? error.data.CODE : undefined);
      }
      const data = envelope as Record<string, unknown>;
      const result = resultSchema.parse(data.RESULT);
      if (result.CODE !== "INFO-000") {
        if (result.CODE === "INFO-200") return { totalCount: 0, rows: [] as T[], payload };
        throw new SeoulApiError(result.MESSAGE ?? result.CODE, result.CODE);
      }
      const rows = z.array(rowSchema).parse(data.row ?? []);
      return { totalCount: Number(data.list_total_count ?? rows.length), rows, payload };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

export function redactSeoulKey(value: string, apiKey: string) {
  return value.replaceAll(apiKey, "[REDACTED]");
}

export async function fetchAllSeoulRows<T>(
  apiKey: string,
  service: string,
  rowSchema: z.ZodType<T>,
  parameters: string[] = [],
  options: FetchOptions = {},
) {
  const pageSize = 1000;
  const first = await fetchSeoulPage(buildSeoulUrl(apiKey, service, 1, pageSize, parameters), service, rowSchema, options);
  const rows = [...first.rows];
  const payloads: unknown[] = [first.payload];
  for (let start = pageSize + 1; start <= first.totalCount; start += pageSize) {
    const page = await fetchSeoulPage(buildSeoulUrl(apiKey, service, start, Math.min(start + pageSize - 1, first.totalCount), parameters), service, rowSchema, options);
    rows.push(...page.rows);
    payloads.push(page.payload);
  }
  return { rows, payloads, totalCount: first.totalCount };
}
