from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SITE_URL = "https://www.binzibe.kr/main/html/map.html"
BASE_URL = "https://www.binzibe.kr"
FILTER_URL = f"{BASE_URL}/apihome/map/filter-options"
STATE_URL = f"{BASE_URL}/apihome/state/list"
USER_AGENT = "UrbanRegenerationVacancyCollector/1.0 (+public administrative aggregate only)"
ROOT = Path(__file__).resolve().parents[1]
TARGET_CONFIG = ROOT / "config" / "target_vacancy_areas.json"


def load_targets() -> list[dict[str, Any]]:
    return [row for row in json.loads(TARGET_CONFIG.read_text(encoding="utf-8")) if row.get("enabled")]


def session() -> requests.Session:
    client = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(("GET",)),
        respect_retry_after_header=True,
    )
    client.mount("https://", HTTPAdapter(max_retries=retry))
    client.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Referer": SITE_URL,
    })
    return client


def get_json(client: requests.Session, url: str, *, params: dict[str, Any] | None = None,
             delay: float = 1.0) -> tuple[Any, requests.Response]:
    time.sleep(max(0, delay))
    response = client.get(url, params=params, timeout=(10, 45))
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").lower()
    if "json" not in content_type:
        raise ValueError(f"JSON이 아닌 응답입니다: {content_type or 'Content-Type 없음'}")
    return response.json(), response


def stable_hash(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def source_legal_name(row: dict[str, Any]) -> str:
    return str(row.get("sojaeji", "")).split("_")[-1]


def validate_state_rows(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, list):
        raise ValueError("state/list 응답이 배열이 아닙니다.")
    required = {"reg", "sojaeji", "binCnt", "baseLevel"}
    for index, row in enumerate(payload):
        if not isinstance(row, dict) or not required.issubset(row):
            raise ValueError(f"state/list 응답 스키마 변경 감지: row {index}")
        if row["binCnt"] is not None and not isinstance(row["binCnt"], (int, float)):
            raise ValueError(f"binCnt 형식 변경 감지: row {index}")
    return payload
