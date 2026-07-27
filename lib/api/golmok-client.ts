import { z } from "zod";

const BASE_URL = "https://golmok.seoul.go.kr";
const yearSchema = z.array(z.object({
  YEARS: z.coerce.string(),
  QU: z.coerce.string(),
}));

async function postForm(path: string, body: Record<string, string>) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      referer: `${BASE_URL}/stateArea.do`,
      "user-agent": "GaribongUrbanRegenerationDashboard/1.0 public-data-collector",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`서울시 상권분석서비스 조건검색 실패: HTTP ${response.status} (${path})`);
  return response.json() as Promise<unknown>;
}

export async function fetchGolmokConditionRows<T>(
  endpoint: string,
  category: "income" | "rent" | "opening" | "population",
  districtCode: string,
  rowSchema: z.ZodType<T>,
  options: { svcIndutyCdL?: string; svcIndutyCdM?: string } = {},
) {
  const yearsPayload = await postForm("/region/selectYearData.json", {});
  const years = yearSchema.parse(yearsPayload);
  const latest = years[0];
  if (!latest) throw new Error("서울시 상권분석서비스에서 최신 기준분기를 확인할 수 없습니다.");
  const request = {
    stdrYyCd: latest.YEARS,
    stdrSlctQu: "beforeQu",
    stdrQuCd: latest.QU,
    stdrMnCd: "",
    selectTerm: "quarter",
    svcIndutyCdL: options.svcIndutyCdL ?? "",
    svcIndutyCdM: options.svcIndutyCdM ?? "",
    stdrSigngu: districtCode,
    selectInduty: "1",
    infoCategory: category,
  };
  const rowsPayload = await postForm(`/region/${endpoint}`, request);
  return {
    year: latest.YEARS,
    quarter: latest.QU,
    period: `${latest.YEARS}${latest.QU}`,
    rows: z.array(rowSchema).parse(rowsPayload),
    rawPayloads: [yearsPayload, rowsPayload],
  };
}
