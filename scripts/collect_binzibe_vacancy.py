from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from binzibe_common import (
    FILTER_URL, ROOT, SITE_URL, STATE_URL, get_json, load_targets, session,
    source_legal_name, stable_hash, validate_state_rows,
)

PROCESSED_COLUMNS = [
    "base_year", "base_date", "sido_code", "sido_name", "district_code", "district_name",
    "admin_dong_code", "admin_dong_name", "indicator_code", "indicator_name", "raw_value",
    "unit", "vacancy_grade", "housing_type", "source_name", "source_url", "source_method",
    "collected_at", "data_updated_at", "collection_status", "error_message", "raw_file_path",
    "data_quality_note", "fingerprint",
]


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="빈집애 법정동 집계 기반 대상지역 보조지표 수집")
    parser.add_argument("--area")
    parser.add_argument("--all-targets", action="store_true")
    parser.add_argument("--headed", action="store_true", help="직접 HTTP 재현 방식에서는 사용하지 않음")
    parser.add_argument("--headless", action="store_true", help="직접 HTTP 재현 방식에서는 사용하지 않음")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--save-har", action="store_true", help="네트워크 조사 스크립트에서 사용")
    parser.add_argument("--max-requests", type=int, default=10)
    parser.add_argument("--request-delay", type=float, default=1.0)
    parser.add_argument("--output-dir", default=str(ROOT / "data"))
    return parser.parse_args()


def select_targets(args: argparse.Namespace) -> list[dict[str, Any]]:
    targets = load_targets()
    if args.area:
        targets = [row for row in targets if row["admin_dong_name"] == args.area or row["slug"] == args.area]
        if not targets:
            raise ValueError(f"설정에 없는 대상 지역입니다: {args.area}")
    elif not args.all_targets:
        raise ValueError("--area 또는 --all-targets가 필요합니다.")
    return targets


def main() -> None:
    args = arguments()
    targets = select_targets(args)
    output_root = Path(args.output_dir)
    collected_at = datetime.now(timezone.utc)
    run_id = collected_at.strftime("%Y%m%dT%H%M%SZ")
    raw_dir = output_root / "raw" / "binzibe" / run_id
    raw_dir.mkdir(parents=True, exist_ok=False)
    client = session()
    client.get(SITE_URL, timeout=(10, 45)).raise_for_status()
    filters, filter_response = get_json(client, FILTER_URL, delay=args.request_delay)
    years = filters.get("years") if isinstance(filters, dict) else None
    if not years or not isinstance(years[0].get("year"), int):
        raise ValueError("filter-options에서 조사연도를 확인할 수 없습니다.")
    year = years[0]["year"]
    payload, state_response = get_json(client, STATE_URL, params={"year": year}, delay=args.request_delay)
    rows = validate_state_rows(payload)

    filter_file = raw_dir / "response_filter_options.json"
    state_file = raw_dir / f"response_state_list_{year}.json"
    filter_file.write_text(json.dumps(filters, ensure_ascii=False, indent=2), encoding="utf-8")
    state_file.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    request_descriptor = {"url": STATE_URL, "method": "GET", "params": {"year": year}}
    request_hash = stable_hash(request_descriptor)
    manifest = {
        "collected_at": collected_at.isoformat(),
        "source": SITE_URL,
        "method": "ajax",
        "requests": [
            {"url": filter_response.url, "status": filter_response.status_code, "content_type": filter_response.headers.get("content-type"), "file": str(filter_file.relative_to(ROOT))},
            {"url": state_response.url, "status": state_response.status_code, "content_type": state_response.headers.get("content-type"), "file": str(state_file.relative_to(ROOT)), "request_hash": request_hash},
        ],
        "privacy": "개별 주소·좌표·건물 식별정보를 수집하지 않음",
    }
    (raw_dir / "request_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    output_rows: list[dict[str, Any]] = []
    for target in targets:
        match = next((
            row for row in rows
            if row["baseLevel"] == 3
            and str(row["reg"]) == target["district_code"]
            and source_legal_name(row) == target["source_legal_dong_name"]
        ), None)
        proxy = target["source_legal_dong_name"] != target["admin_dong_name"]
        value = match.get("binCnt") if match else None
        note = (
            f"빈집애는 행정동이 아닌 {target['source_legal_dong_name']} 법정동 전체만 제공합니다. "
            f"{target['admin_dong_name']} 독립값이 아니며 동일 법정동을 공유하는 행정동에 중복 표시되는 대체지표입니다."
            if proxy else
            "빈집애 법정동명이 대상 행정동명과 같지만, 출처 집계경계는 법정동 기준입니다."
        )
        fingerprint = stable_hash({
            "admin_dong_code": target["admin_dong_code"],
            "base_year": year,
            "indicator_code": "vacant_house_count",
            "source_url": state_response.url,
            "request_hash": request_hash,
        })
        output_rows.append({
            "base_year": year,
            "base_date": f"{year}-01-01",
            "sido_code": target["sido_code"],
            "sido_name": target["sido_name"],
            "district_code": target["district_code"],
            "district_name": target["district_name"],
            "admin_dong_code": target["admin_dong_code"],
            "admin_dong_name": target["admin_dong_name"],
            "indicator_code": "vacant_house_count",
            "indicator_name": "빈집 수",
            "raw_value": value if value is not None else "",
            "unit": "호",
            "vacancy_grade": "",
            "housing_type": "",
            "source_name": "빈집애(REB) 빈집지도",
            "source_url": SITE_URL,
            "source_method": "ajax",
            "collected_at": collected_at.isoformat(),
            "data_updated_at": "",
            "collection_status": "success" if value is not None else "empty",
            "error_message": "" if match else "대상 법정동 집계행을 찾지 못했습니다.",
            "raw_file_path": str(state_file.relative_to(ROOT)),
            "data_quality_note": f"조사 기준은 {year}년으로만 제공되어 base_date는 기간 식별용 연도 시작일입니다. {note}",
            "fingerprint": fingerprint,
        })

    processed_file = output_root / "processed" / "binzibe_vacancy_indicators.csv"
    existing: list[dict[str, str]] = []
    if processed_file.exists():
        with processed_file.open(encoding="utf-8-sig", newline="") as stream:
            existing = list(csv.DictReader(stream))
    known = {row.get("fingerprint") for row in existing}
    additions = output_rows if args.force else [row for row in output_rows if row["fingerprint"] not in known]
    if not args.dry_run:
        processed_file.parent.mkdir(parents=True, exist_ok=True)
        with processed_file.open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=PROCESSED_COLUMNS)
            writer.writeheader()
            writer.writerows(existing + additions)
        log_file = output_root / "metadata" / "binzibe_collection_log.csv"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_exists = log_file.exists()
        with log_file.open("a", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=["run_id", "collected_at", "year", "targets", "success", "empty", "raw_dir"])
            if not log_exists:
                writer.writeheader()
            writer.writerow({
                "run_id": run_id, "collected_at": collected_at.isoformat(), "year": year,
                "targets": len(output_rows),
                "success": sum(row["collection_status"] == "success" for row in output_rows),
                "empty": sum(row["collection_status"] != "success" for row in output_rows),
                "raw_dir": str(raw_dir.relative_to(ROOT)),
            })
    print(json.dumps({"year": year, "rows": output_rows, "new_rows": len(additions), "dry_run": args.dry_run}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
