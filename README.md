# 가리봉동 도시재생 주민체감 보조지표

서울특별시 구로구 가리봉동 행정동 전체를 대상으로 공공데이터 기반 주민체감 보조지표를 수집하고 시각화하는 MVP입니다. 과거 `가리봉 도시재생활성화사업`을 설명 맥락으로 사용하지만, 지표의 공간범위는 도시재생활성화구역 경계가 아닌 **가리봉동 행정동 전체**입니다.

> 본 지표는 주민 만족도를 직접 측정한 값이 아니라 생활환경, 지역활력 및 상권 변화를 보조적으로 확인하기 위한 Proxy입니다. 공식 도시재생 성과평가와 주민 설문 결과를 함께 고려해야 합니다.

## 구현 지표

| 지표 | 자료원 | 공간단위 | 공표주기 | 수집주기 |
|---|---|---|---|---|
| 일평균 생활인구 | 행정동 단위 서울 생활인구(내국인) | 행정동 | 매일 | daily |
| 30년 이상 노후건축물 비율 | 서울시 건축물대장 총괄표제부 | 법정동 계열 | 매일 | monthly, 현재 비활성 |
| 전체 점포 수 | 상권분석서비스(점포-행정동) | 행정동 | 분기 | quarterly |
| 총·시간대별 유동인구 | 상권분석서비스(길단위인구-행정동) | 행정동 | 분기 | quarterly |

노후건축물은 총괄표제부만으로 전체 건축물을 대표할 수 있는지 검증이 끝나지 않았으므로 값을 만들지 않고 `자료원 검증 불충분`으로 표시합니다.

## 기술 스택

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Recharts, Zod
- PostgreSQL, Prisma ORM 7
- Vitest, React Testing Library

SQLite에서 PostgreSQL로 공급자를 바꾸면 Prisma migration 이력을 재생성해야 하므로 처음부터 PostgreSQL을 사용합니다.

## 설치

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

PowerShell 실행 정책에 따라 `npm` 대신 `npm.cmd`가 필요할 수 있습니다.

## 환경변수

```dotenv
DATABASE_URL=postgresql://런타임_연결_문자열
DIRECT_URL=postgresql://migration과_seed용_연결_문자열
SEOUL_OPEN_API_KEY=
DATA_MODE=mock
SAVE_RAW_RESPONSES=false
COLLECTION_ADMIN_TOKEN=
```

- `SEOUL_OPEN_API_KEY`는 서버와 CLI에서만 읽습니다. `NEXT_PUBLIC_` 접두어를 사용하지 않습니다.
- `DATA_MODE=live`인데 `DATABASE_URL` 또는 API 키가 없으면 명확한 오류가 발생합니다.
- 실제 키를 로그, README, Git에 기록하지 마십시오.
- `COLLECTION_ADMIN_TOKEN`을 설정하지 않으면 `POST /api/collection/run`은 503으로 비활성화됩니다.

## PostgreSQL 설정

빈 로컬 PostgreSQL 데이터베이스를 준비한 경우 다음을 실행합니다. Supabase 운영 환경은 아래의 별도 설정과 `db:migrate:deploy` 절차를 따릅니다.

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
```

seed에는 지역, 공식 사업 출처, 데이터 소스와 지표 정의만 포함됩니다. 사업기간은 공식 자료에서 확인된 연도 단위 `2015~2020`으로 저장하며 세부 일자를 사실로 단정하지 않습니다.

## 실행

키와 DB 없이 고정 fixture 화면을 확인할 수 있습니다.

```powershell
npm.cmd run dev
npm.cmd run collect:mock
```

실제 수집은 DB migration과 seed를 마친 후 실행합니다.

```powershell
npm.cmd run collect:live
npm.cmd run collect:daily
npm.cmd run collect:monthly
npm.cmd run collect:quarterly
npm.cmd run collect -- --source living-population
npm.cmd run collect -- --indicator living_population
npm.cmd run collect -- --area garibong
```

한 소스가 실패해도 다른 소스 수집은 계속됩니다. 결과 요약은 소스 수, 성공·실패 수, 저장·건너뜀 수와 소스별 오류를 포함합니다. 인증키와 원본 payload는 출력하지 않습니다.

## 내부 API

- `GET /api/areas`
- `GET /api/areas/garibong`
- `GET /api/areas/garibong/indicators`
- `GET /api/areas/garibong/indicators/{indicatorCode}`
- `GET /api/areas/garibong/charts/{chartCode}`
- `GET /api/collection-status`
- `POST /api/collection/run` — Bearer 관리자 토큰 필요

## 테스트와 빌드

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

테스트는 증감값·증감률, 0 나눗셈, null, 방향성, 노후건축물 계산, 코드 유형, 서울 API 결과코드·HTTP 재시도, mock 수집, 카드의 자료 없음 표시를 다룹니다.

## 데이터 출처

- [행정동 단위 서울 생활인구(내국인)](https://data.seoul.go.kr/dataList/OA-14991/S/1/datasetView.do)
- [서울시 상권분석서비스(점포-행정동)](https://data.seoul.go.kr/dataList/OA-22172/S/1/datasetView.do)
- [서울시 상권분석서비스(길단위인구-행정동)](https://data.seoul.go.kr/dataList/OA-22178/S/1/datasetView.do)
- [서울시 건축물대장 총괄표제부](https://data.seoul.go.kr/dataList/OA-22423/S/1/datasetView.do)
- [구로구 가리봉동 도시재생 공식 자료](https://www.guro.go.kr/ceo/downloadContentsFile.do?fileNm=cts1269_file5.pdf)

서울 열린데이터광장 API는 일반적으로 한 번에 최대 1,000건이므로 수집기는 페이지를 나누어 호출합니다. 생활인구 Open API는 최근 2개월 자료만 제공하므로 장기 시계열 초기 적재에는 공식 월별 파일을 별도로 사용해야 합니다. 상권분석 자료는 2026년 7월 정책 변경 이후 2021년 이후 자료를 제공합니다.

## 행정동·법정동 주의사항

`data/target-areas.json`은 다음 코드 유형을 별도로 보관합니다.

- 생활인구·상권분석: 8자리 주민등록 행정기관코드
- 건축물·주소: 10자리 법정동코드

행정동 코드는 2026-07-18 `SPOP_LOCAL_RESD_DONG` sample 응답에서 기준일 2026-06-30의 가리봉동 레코드로 검증했습니다. 법정동 코드는 건축물 adapter 활성화 전에 최신 공식 원장과 실제 응답을 다시 대조해야 합니다. 코드만 같거나 이름만 같은 레코드는 수집하지 않습니다.

## 상태와 결측 처리

- `empty`: 정상 응답이나 제공 자료 없음
- `stale`: 이번 수집 실패 후 최근 정상값
- `error`: 수집 또는 DB 저장 실패
- `mock`: 고정 예시 데이터
- `partial_success`: 일부 소스만 성공

null은 0으로 바꾸지 않으며 차트에서 연결하거나 임의 보간하지 않습니다. mock과 live는 같은 정규화 스키마를 사용하지만 화면 배지로 명확히 구분합니다.

## 확장 방향

1. 건축물 표제부까지 포함한 완전성 검증 후 노후건축물 adapter 활성화
2. 생활인구 월별 파일의 초기 적재 importer
3. 도로굴착, 전월세, 공공서비스예약 adapter
4. 공식 도시재생활성화구역 경계가 확보되면 공간 포함 판정
5. 구로구 다른 행정동과 서울 도시재생 지역 비교

## Supabase PostgreSQL 설정 (1단계)

이 단계는 기존 Prisma ORM과 데이터 모델을 유지하고 연결 대상만 Supabase PostgreSQL로 확장합니다. Supabase의 Project URL이나 API key만으로는 Prisma가 데이터베이스에 연결할 수 없습니다. Supabase Dashboard의 **Connect** 화면에서 PostgreSQL 연결 문자열 두 개를 확인해 `.env.local`에 설정합니다.

```dotenv
# Vercel/Next.js 런타임: transaction pooler(일반적으로 6543)
DATABASE_URL="postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# migration, seed, 백업: direct connection 또는 session pooler(5432)
DIRECT_URL="postgresql://postgres.PROJECT_REF:DB_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_PROJECT_ID="PROJECT_REF"
```

`SUPABASE_API_KEY`와 service role key는 Prisma 연결에 필요하지 않습니다. 특히 service role key를 `NEXT_PUBLIC_*` 변수에 넣거나 클라이언트 코드에서 사용하지 마십시오. Vercel에는 `DATABASE_URL`과 서버 전용 수집 키를 암호화된 Environment Variable로 등록합니다. `DIRECT_URL`은 migration을 실행하는 안전한 관리 환경에만 두는 것을 권장합니다.

### 기존 데이터 백업

기존 PostgreSQL에 데이터가 있다면 migration 전에 기존 DB 연결 문자열로 custom-format 백업을 생성하고 파일 크기가 0보다 큰지 확인합니다. 이 명령은 데이터베이스를 변경하지 않습니다.

```powershell
pg_dump.exe --format=custom --no-owner --no-privileges --file="garibong-before-supabase.dump" "기존_DATABASE_URL"
Get-Item .\garibong-before-supabase.dump | Select-Object FullName, Length
```

복구는 별도 빈 데이터베이스에서 먼저 검증합니다: `pg_restore.exe --list .\garibong-before-supabase.dump`. 현재 연결 문자열을 모르면 migration이나 seed를 실행하지 마십시오.

### 스키마 준비와 연결 확인

아래 순서에서 `migrate deploy`는 기존 행을 삭제하지 않고 저장소의 migration만 적용합니다. `db:seed`는 기준 지역·출처·지표 정의를 `upsert`하며 관측값을 임의 생성하지 않습니다. 운영 DB에서는 백업 확인 후 명시적으로 실행합니다.

```powershell
npm.cmd run db:validate
npm.cmd run db:generate
npm.cmd run db:migrate:deploy
npm.cmd run db:seed
```

읽기 전용 연결 테스트는 `SELECT 1`만 실행하며 테스트 데이터를 삽입하지 않습니다.

```powershell
$env:RUN_SUPABASE_INTEGRATION="true"
npm.cmd run test:db
Remove-Item Env:RUN_SUPABASE_INTEGRATION
```

`DATA_MODE=mock`이면 `DATABASE_URL`과 API 키가 없어도 기존 mock 대시보드와 mock 수집이 동작합니다. `DATA_MODE=live`는 `DATABASE_URL`과 `SEOUL_OPEN_API_KEY`가 모두 있어야 시작합니다.

이번 RLS migration은 모든 애플리케이션 테이블에서 RLS를 활성화하되 anon/authenticated 정책은 만들지 않습니다. 현재는 서버 전용 Prisma 연결만 사용합니다. 다음 단계에서 실제 공개 읽기 요구사항을 확정한 뒤 최소 권한 정책을 별도 migration으로 추가합니다.

## 자동·즉시 데이터 수집 설정

공공데이터 원천은 일간·월간·분기로 갱신되므로 초 단위 스트리밍이 아니라 원천 주기에 맞춘 자동 polling 방식입니다. `vercel.json`의 Vercel Cron은 매일 UTC 18:20(한국시간 다음 날 03:20)에 `/api/cron/collect`를 호출합니다.

- 매일: 일간 adapter
- 매월 2일(한국시간): 일간 + 월간 adapter
- 1·4·7·10월 2일(한국시간): 일간 + 월간 + 분기 adapter

Vercel 프로젝트의 **Settings → Environment Variables**에서 Production 환경에 다음 값을 입력합니다.

```dotenv
DATABASE_URL="Supabase transaction pooler 6543 URL"
SEOUL_OPEN_API_KEY="서울 열린데이터광장 인증키"
DATA_MODE="live"
SAVE_RAW_RESPONSES="false"
CRON_SECRET="16자 이상의 별도 임의 문자열"
COLLECTION_ADMIN_TOKEN="16자 이상의 별도 임의 문자열"
```

`DIRECT_URL`, Supabase service role key, `SUPABASE_API_KEY`는 Vercel 런타임에 필요하지 않습니다. `CRON_SECRET`과 `COLLECTION_ADMIN_TOKEN`은 서로 다른 값으로 만들고 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다. GitHub Actions 예약 수집도 사용할 경우 중복 실행될 수 있으므로 `ENABLE_SCHEDULED_COLLECTION`은 설정하지 않거나 `false`로 둡니다.

Vercel Cron은 `CRON_SECRET`을 `Authorization: Bearer ...` 헤더로 자동 전송합니다. 배포 후 Vercel 프로젝트의 **Settings → Cron Jobs**에서 등록 여부를 확인하고 **View Logs**로 실행 결과를 확인합니다.

즉시 수집은 관리자 토큰으로 보호된 기존 API를 사용합니다. 아래 예시의 도메인과 토큰을 실제 값으로 바꿉니다.

```powershell
$headers = @{ Authorization = "Bearer 여기에_COLLECTION_ADMIN_TOKEN" }
$body = @{ mode = "live"; area = "garibong"; cycle = "daily" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://여기에-배포도메인/api/collection/run" -Headers $headers -ContentType "application/json" -Body $body
```

`cycle`은 `daily`, `monthly`, `quarterly` 중 하나입니다. 특정 수집기만 실행하려면 body에서 `cycle` 대신 `source`를 사용합니다. 수집 응답과 로그에는 원본 API payload를 포함하지 않습니다.
