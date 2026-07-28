from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from binzibe_common import ROOT, load_targets, source_legal_name


def percent_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / previous * 100


def lower_is_better_score(rate: float | None) -> int | None:
    if rate is None:
        return None
    if rate <= -20:
        return 5
    if rate <= -5:
        return 4
    if rate < 5:
        return 3
    if rate < 20:
        return 2
    return 1


def district_comparison(row: dict[str, str], target: dict[str, object]) -> tuple[float | None, int]:
    raw_path = ROOT / row["raw_file_path"]
    if not raw_path.exists():
        return None, 0
    payload = json.loads(raw_path.read_text(encoding="utf-8"))
    values_by_legal_dong: dict[str, float] = {}
    for candidate in payload:
        if (
            candidate.get("baseLevel") != 3
            or str(candidate.get("reg")) != row["district_code"]
            or source_legal_name(candidate) == target["source_legal_dong_name"]
            or not isinstance(candidate.get("binCnt"), (int, float))
        ):
            continue
        values_by_legal_dong[source_legal_name(candidate)] = float(candidate["binCnt"])
    values = list(values_by_legal_dong.values())
    return (sum(values) / len(values), len(values)) if values else (None, 0)


def main() -> None:
    source = ROOT / "data" / "processed" / "binzibe_vacancy_indicators.csv"
    if not source.exists():
        raise FileNotFoundError("먼저 collect_binzibe_vacancy.py를 실행하세요.")
    with source.open(encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["admin_dong_code"]].append(row)
    targets = {row["admin_dong_code"]: row for row in load_targets()}
    result = []
    for admin_code, area_rows in grouped.items():
        ordered = sorted(area_rows, key=lambda row: row["base_year"])
        current = ordered[-1]
        previous = ordered[-2] if len(ordered) > 1 else None
        current_value = float(current["raw_value"]) if current["raw_value"] else None
        previous_value = float(previous["raw_value"]) if previous and previous["raw_value"] else None
        comparison_average, comparison_count = district_comparison(current, targets[admin_code])
        comparison_rate = (
            (current_value - comparison_average) / abs(comparison_average) * 100
            if current_value is not None and comparison_average not in (None, 0)
            else None
        )
        result.append({
            "admin_dong_code": admin_code,
            "admin_dong_name": current["admin_dong_name"],
            "base_year": int(current["base_year"]),
            "vacant_house_count": current_value,
            "previous_period_change_rate": percent_change(current_value, previous_value),
            "vacancy_ratio": None,
            "long_term_vacancy_ratio": None,
            "high_risk_vacancy_ratio": None,
            "district_legal_dong_average": comparison_average,
            "district_comparison_count": comparison_count,
            "comparison_rate": comparison_rate,
            "indicator_score": lower_is_better_score(comparison_rate),
            "planned_indicators": 5,
            "available_indicators": 1 if current_value is not None else 0,
            "data_completeness": 20 if current_value is not None else 0,
            "comparison_availability": {
                "previous_period": previous_value is not None,
                "district_average": comparison_average is not None,
                "seoul_average": False,
            },
            "note": current["data_quality_note"],
        })
    destination = ROOT / "data" / "processed" / "binzibe_vacancy_summary.json"
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
