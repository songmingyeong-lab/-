# 빈집애 공개 지도 네트워크 분석

조사일: 2026-07-27
대상: <https://www.binzibe.kr/main/html/map.html>

## 결론

빈집애 지도는 로그인 없이 공개 `fetch` 요청으로 집계 데이터를 조회한다. 실제 Chrome
세션에서 다음 요청을 확인했고, 동일 요청을 `requests.Session`으로 재현했다.

| 용도 | method | 실제 요청 |
|---|---|---|
| 화면 설정 | GET | `/main/config.json` |
| 연도·시도·지표 목록 | GET | `/apihome/map/filter-options` |
| 시군구 코드 | GET | `/apihome/map/codes/sigungu?sidoCode=11` |
| 지도 순위 | GET | `/apihome/map/vacant-houses/rank?year=2026&mapInfo=VACANT_COUNT` |
| 빈집 집계 | GET | `/apihome/state/list?year=2026` |

모두 `application/json`, 페이지 Referer 기반 공개 요청이다. 브라우저 요청에는 일반 세션
쿠키가 붙었지만, 최초 지도 페이지 GET 후 쿠키를 유지한 직접 HTTP 요청과 쿠키 없는
GET 모두 200 응답을 확인했다. 로그인·CAPTCHA·인증 토큰은 없었다. 호출 제한 헤더나
페이지네이션은 관찰되지 않았다. 수집기는 요청 사이에 기본 1초 지연을 둔다.

`robots.txt`는 유효한 robots 문서가 아니라 사이트 오류 페이지를 반환했다. 따라서
명시적인 허용·금지 규칙을 확인할 수 없었고, 공개 화면이 직접 사용하는 집계 요청만
최소 빈도로 호출한다.

## 응답 스키마

`/apihome/state/list?year=2026`은 배열이며 확인된 필드는 다음과 같다.

- `reg`: 시군구 코드(예: 종로구 `11110`, 구로구 `11530`)
- `sojaeji`: `시도_시군구_법정동` 형식 명칭
- `binCnt`: 빈집 수
- `baseLevel`: 1 시도, 2 시군구, 3 법정동
- `rnk`: 동일 단계 순위
- `sidoOrd`: 시도 정렬값

응답의 `year`, `code`, `name`은 현재 null이었다. 정확한 조사일·갱신일, 빈집 등급,
주택유형, 전체 주택 수는 이 응답에서 제공되지 않는다.

## 공간단위 제약

사이트 화면에는 연도·시도·시군구 선택만 있고 행정동 선택자가 없다. `baseLevel=3`도
행정동 코드가 아닌 법정동명 집계다.

- 가리봉동: 가리봉동 법정동 전체 1호
- 창신1·2·3동: 각각의 값은 없고 창신동 법정동 전체 30호만 제공
- 숭인1동: 독립값은 없고 숭인동 법정동 전체 5호만 제공

따라서 창신1·2·3동에는 같은 창신동 30호를 “법정동 전체 대체값”으로 표시한다.
창신·숭인 통합은 중복을 제거해 창신동 30호 + 숭인동 5호 = 35호로 계산한다.

## 개인정보·위치 보호

개별 주소, 좌표, 건물 식별자, 지도 타일은 저장하지 않는다. `network.har`는 지도 타일,
GeoServer 요청, 쿠키, 응답 본문을 제외하고 공개 집계 API 메타데이터만 담은 정제 HAR이다.

## 데이터 품질

사이트 자체 안내에 따라 이 값은 지자체 빈집행정조사 결과인 단순 수량 정보이며
국가승인통계가 아니다. 조사 담당자의 숙련도와 현장 여건에 따른 품질 한계가 있을 수
있다. 주민 만족도나 도시재생사업 효과를 직접 측정하지 않는다.

## 제외 지표

동일 출처에서 분모·분류·이전 시점이 확인되지 않아 빈집 비율, 빈집 증감률, 장기 빈집
비중, 위험등급 빈집 비중, 주택유형별 분포, 정확한 조사 기준일·갱신일은 생성하지 않는다.

## 구조 변경 점검

변경 시 `scripts/inspect_binzibe_network.py`, `scripts/binzibe_common.py`,
`scripts/collect_binzibe_vacancy.py`, `lib/collection/adapters/binzibe-vacancy.ts`를 확인한다.
필수 선택자는 `#selectSurveyYear`, `#selectRegion`, `#selectSigungu`,
`#applyFilterBtn`, 필수 응답 필드는 `reg`, `sojaeji`, `binCnt`, `baseLevel`이다.
