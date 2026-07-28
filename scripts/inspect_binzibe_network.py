from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlparse

from playwright.sync_api import sync_playwright

from binzibe_common import ROOT, SITE_URL


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="빈집애 공개 지도 네트워크 요청 조사")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--headed", action="store_true")
    mode.add_argument("--headless", action="store_true")
    parser.add_argument("--save-har", action="store_true")
    parser.add_argument("--max-requests", type=int, default=500)
    parser.add_argument("--output-dir", default=str(ROOT / "data" / "raw" / "binzibe" / "network"))
    return parser.parse_args()


def main() -> None:
    args = arguments()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    har_path = output / "network.har"
    requests_log: list[dict[str, object]] = []
    candidates: list[dict[str, object]] = []
    seen_candidates: set[str] = set()

    with sync_playwright() as playwright:
        print("browser:launch", flush=True)
        browser = playwright.chromium.launch(
            headless=not args.headed,
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            args=["--disable-background-networking", "--disable-component-update"],
        )
        context = browser.new_context(locale="ko-KR")
        page = context.new_page()
        page.set_default_timeout(20_000)
        page.route(
            "**/*",
            lambda route: route.abort()
            if route.request.resource_type in {"image", "font", "media"}
            or "/geo/" in urlparse(route.request.url).path
            or "map.pstatic.net" in route.request.url
            else route.continue_(),
        )

        def on_request(request) -> None:
            if len(requests_log) >= args.max_requests:
                return
            parsed = urlparse(request.url)
            if request.resource_type not in {"document", "xhr", "fetch", "script"}:
                return
            if "/geo/" in parsed.path or "tile" in parsed.path.lower():
                return
            requests_log.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "url": request.url,
                "method": request.method,
                "resource_type": request.resource_type,
                "query_parameters": dict(parse_qsl(parsed.query, keep_blank_values=True)),
                "post_data": request.post_data,
                "content_type": request.headers.get("content-type"),
                "referer": request.headers.get("referer"),
                "origin": request.headers.get("origin"),
                "cookie_or_session_present": bool(request.headers.get("cookie")),
            })

        def on_response(response) -> None:
            request = response.request
            content_type = response.headers.get("content-type", "")
            if (
                "binzibe.kr" in response.url
                and ("json" in content_type.lower() or request.resource_type in {"xhr", "fetch"})
                and response.url not in seen_candidates
            ):
                seen_candidates.add(response.url)
                candidates.append({
                    "url": response.url,
                    "method": request.method,
                    "status": response.status,
                    "resource_type": request.resource_type,
                    "content_type": content_type,
                    "query_parameters": dict(parse_qsl(urlparse(response.url).query, keep_blank_values=True)),
                    "cookie_or_session_present_in_observed_request": bool(request.headers.get("cookie")),
                    "cookie_or_session_required": False,
                })

        page.on("request", on_request)
        page.on("response", on_response)
        try:
            print("page:goto", flush=True)
            page.goto(SITE_URL, wait_until="domcontentloaded", timeout=30_000)
            print("page:filters", flush=True)
            page.wait_for_function(
                "() => document.querySelector('#selectSurveyYear')?.options.length >= 1 "
                "&& document.querySelector('#selectSurveyYear').value !== ''",
                timeout=20_000,
            )
            page.locator("#selectRegion").select_option("11")
            # 현 화면은 행정동 selector를 제공하지 않으며 시군구 동적 옵션도
            # 브라우저 환경에 따라 늦게 채워진다. 페이지가 사용하는 공개 코드
            # 요청을 동일 브라우저 세션에서 확인하고, 행정동 선택 부재를 기록한다.
            page.evaluate(
                "() => fetch('/apihome/map/codes/sigungu?sidoCode=11', "
                "{headers: {'Accept': 'application/json'}}).then(r => r.json())"
            )
            print("page:apply", flush=True)
            page.locator("#applyFilterBtn").click()
            page.wait_for_timeout(1_000)
            print("page:complete", flush=True)
        except Exception:
            page.screenshot(path=str(output / "inspection_error.png"), full_page=True)
            raise
        finally:
            print("browser:close", flush=True)
            context.close()
            browser.close()

    with (output / "network_log.jsonl").open("w", encoding="utf-8") as stream:
        for item in requests_log:
            stream.write(json.dumps(item, ensure_ascii=False) + "\n")
    (output / "request_candidates.json").write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if args.save_har:
        sanitized_har = {
            "log": {
                "version": "1.2",
                "creator": {"name": "inspect_binzibe_network.py", "version": "1.0"},
                "comment": "개별 위치 보호를 위해 지도 타일·GeoServer·쿠키·응답 본문을 제외한 정제 HAR",
                "entries": [{
                    "startedDateTime": datetime.now(timezone.utc).isoformat(),
                    "time": 0,
                    "request": {
                        "method": item["method"],
                        "url": item["url"],
                        "httpVersion": "HTTP/2",
                        "headers": [],
                        "queryString": [{"name": key, "value": value} for key, value in item["query_parameters"].items()],
                        "cookies": [],
                        "headersSize": -1,
                        "bodySize": 0,
                    },
                    "response": {
                        "status": item["status"],
                        "statusText": "",
                        "httpVersion": "HTTP/2",
                        "headers": [{"name": "content-type", "value": item["content_type"]}],
                        "cookies": [],
                        "content": {"size": 0, "mimeType": item["content_type"], "comment": "본문 저장 제외"},
                        "redirectURL": "",
                        "headersSize": -1,
                        "bodySize": 0,
                    },
                    "cache": {},
                    "timings": {"send": 0, "wait": 0, "receive": 0},
                } for item in candidates],
            }
        }
        har_path.write_text(json.dumps(sanitized_har, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"requests": len(requests_log), "candidates": candidates}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
