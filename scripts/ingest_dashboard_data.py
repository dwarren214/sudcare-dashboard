#!/usr/bin/env python3
"""
Ingest the SUDCare dashboard Excel export and emit normalized JSON fixtures.

Usage:
  python3 scripts/ingest_dashboard_data.py --source "docs/SUDCare Dashboard v0 Dataset.xlsx" --output data/processed
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple
import xml.etree.ElementTree as ET
import zipfile


NS_MAIN = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NAMESPACE = "http://schemas.openxmlformats.org/package/2006/relationships"

EXCEL_EPOCH = datetime(1899, 12, 30)  # Excel's day 0 (accounting for leap year bug)


@dataclass
class InteractionRecord:
    message_id: str
    participant: str
    message_date_serial: Optional[float]
    message_time_fraction: Optional[float]
    day_of_week: Optional[str]
    category: Optional[str]
    other_label: Optional[str]
    category_justification: Optional[str]
    satisfied_raw: Optional[str]
    satisfaction_justification: Optional[str]
    registration_date_serial: Optional[float]
    study_week_raw: Optional[str]
    response_latency_raw: Optional[str]
    emergency_response_raw: Optional[str]
    input_cost_raw: Optional[str]
    output_cost_raw: Optional[str]
    total_cost_raw: Optional[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize dashboard Excel workbook into JSON datasets.")
    parser.add_argument("--source", required=True, type=Path, help="Path to the Excel workbook (.xlsx).")
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Directory where normalized JSON files will be written.",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Participant IDs to exclude when generating the default trimmed dataset (e.g., --exclude p266).",
    )
    parser.add_argument(
        "--dataset-prefix",
        default="dataset",
        help="Base file name prefix for generated datasets (default: dataset).",
    )
    parser.add_argument(
        "--sheet",
        default="merged_data-all",
        help="Worksheet name containing normalized message rows.",
    )
    return parser.parse_args()


def load_shared_strings(zf: zipfile.ZipFile) -> List[str]:
    try:
        data = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []

    root = ET.fromstring(data)
    values: List[str] = []
    for node in root.findall("a:si", NS_MAIN):
        fragments: List[str] = []
        for text_node in node.findall(".//a:t", NS_MAIN):
            fragments.append(text_node.text or "")
        values.append("".join(fragments))
    return values


def map_sheet_names(zf: zipfile.ZipFile) -> Dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))

    rel_targets: Dict[str, str] = {}
    for rel in rels.findall(f"{{{REL_NAMESPACE}}}Relationship"):
        rel_id = rel.attrib["Id"]
        target = rel.attrib["Target"]
        if not target.startswith("/"):
            target = f"xl/{target}"
        else:
            target = target.lstrip("/")
        rel_targets[rel_id] = target

    mapping: Dict[str, str] = {}
    for sheet in workbook.findall("a:sheets/a:sheet", NS_MAIN):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        if rel_id in rel_targets:
            mapping[name] = rel_targets[rel_id]
    return mapping


def column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for ch in letters:
        index = index * 26 + (ord(ch.upper()) - 64)
    return index - 1


def extract_rows(zf: zipfile.ZipFile, sheet_path: str, shared_strings: Sequence[str]) -> List[List[str]]:
    root = ET.fromstring(zf.read(sheet_path))
    rows: List[List[str]] = []

    for row in root.findall("a:sheetData/a:row", NS_MAIN):
        values: Dict[int, str] = {}
        for cell in row.findall("a:c", NS_MAIN):
            ref = cell.attrib.get("r")
            if not ref:
                continue

            idx = column_index(ref)
            cell_type = cell.attrib.get("t")
            value_node = cell.find("a:v", NS_MAIN)
            value = "" if value_node is None else (value_node.text or "")
            if cell_type == "s":
                if value:
                    shared_idx = int(value)
                    if 0 <= shared_idx < len(shared_strings):
                        value = shared_strings[shared_idx]
                else:
                    value = ""

            formula_node = cell.find("a:f", NS_MAIN)
            if formula_node is not None and not value:
                value = formula_node.text or ""

            values[idx] = value

        if not values:
            continue

        max_idx = max(values.keys())
        row_values = ["" for _ in range(max_idx + 1)]
        for idx, value in values.items():
            row_values[idx] = value
        rows.append(row_values)

    return rows


COLUMN_ALIASES = {
    "stud_week": "study_week",
    "participantid": "participant_name",
    "participant": "participant_name",
}


def normalize_column_name(raw: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "_" for ch in (raw or "").strip().lower())
    collapsed = "_".join(filter(None, cleaned.split("_")))
    normalized = COLUMN_ALIASES.get(collapsed, collapsed)
    return normalized


def parse_interactions(rows: List[List[str]]) -> List[InteractionRecord]:
    if not rows:
        return []

    header = [normalize_column_name(cell) for cell in rows[0]]
    col_index_map: Dict[str, int] = {}
    for idx, name in enumerate(header):
        if not name or name in col_index_map:
            continue
        col_index_map[name] = idx

    required_columns = {
        "message_id",
        "participant_name",
        "message_date",
        "message_time",
    }
    missing = sorted(required_columns - set(col_index_map))
    if missing:
        raise ValueError(f"Worksheet is missing required columns: {', '.join(missing)}")

    def cell(name: str, default: Optional[str] = "") -> Optional[str]:
        idx = col_index_map.get(name)
        if idx is None or idx >= len(row):
            return default
        value = row[idx].strip()
        return value or default

    interactions: List[InteractionRecord] = []
    for row in rows[1:]:
        if not any(cell_value.strip() for cell_value in row):
            continue

        interactions.append(
            InteractionRecord(
                message_id=cell("message_id", ""),
                participant=cell("participant_name", ""),
                message_date_serial=_parse_optional_float(cell("message_date")),
                message_time_fraction=_parse_optional_float(cell("message_time")),
                day_of_week=cell("day"),
                category=cell("category"),
                other_label=cell("other_label"),
                category_justification=cell("category_justification"),
                satisfied_raw=cell("satisfied"),
                satisfaction_justification=cell("satisfaction_justification"),
                registration_date_serial=_parse_optional_float(cell("registration_date")),
                study_week_raw=cell("study_week"),
                response_latency_raw=cell("response_latency"),
                emergency_response_raw=cell("emergency_response"),
                input_cost_raw=cell("input_cost"),
                output_cost_raw=cell("output_cost"),
                total_cost_raw=cell("total_cost"),
            ),
        )

    return interactions


def _parse_optional_float(value: Optional[str]) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def to_iso_date(serial: Optional[float]) -> Optional[str]:
    if serial is None or math.isnan(serial):
        return None
    try:
        dt = EXCEL_EPOCH + timedelta(days=serial)
    except OverflowError:
        return None
    return dt.date().isoformat()


def to_iso_datetime(serial_date: Optional[float], fraction: Optional[float]) -> Optional[str]:
    if serial_date is None or math.isnan(serial_date):
        return None

    base = EXCEL_EPOCH + timedelta(days=serial_date)
    fraction = fraction or 0.0
    try:
        dt = base + timedelta(days=fraction)
    except OverflowError:
        return None
    return dt.replace(microsecond=0).isoformat()


def parse_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None

    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes"}:
        return True
    if normalized in {"0", "false", "no"}:
        return False
    return None


def parse_int(value: Optional[str]) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def parse_float(value: Optional[str]) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def normalize_interaction(record: InteractionRecord) -> Dict[str, object]:
    iso_date = to_iso_date(record.message_date_serial)
    occurred_at = to_iso_datetime(record.message_date_serial, record.message_time_fraction)
    registration_date = to_iso_date(record.registration_date_serial)

    return {
        "message_id": record.message_id,
        "participant": record.participant,
        "message_date": iso_date,
        "message_time_fraction": record.message_time_fraction,
        "occurred_at": occurred_at,
        "day_of_week": record.day_of_week or None,
        "category": record.category or None,
        "subcategory": normalize_subcategory(record),
        "category_justification": record.category_justification or None,
        "satisfied": parse_bool(record.satisfied_raw),
        "satisfaction_justification": record.satisfaction_justification or None,
        "registration_date": registration_date,
        "study_week": parse_int(record.study_week_raw),
        "response_latency_seconds": parse_float(record.response_latency_raw),
        "emergency_response": parse_bool(record.emergency_response_raw),
        "input_cost": parse_float(record.input_cost_raw),
        "output_cost": parse_float(record.output_cost_raw),
        "total_cost": parse_float(record.total_cost_raw),
    }


def normalize_subcategory(record: InteractionRecord) -> Optional[str]:
    subcategory = record.other_label or ""
    subcategory = subcategory.strip()
    if not subcategory or subcategory.lower() in {"n/a", "na", "none"}:
        return None
    return subcategory


def build_participant_summaries(interactions: Sequence[Dict[str, object]]) -> List[Dict[str, object]]:
    totals: Dict[str, Dict[str, object]] = {}
    for entry in interactions:
        participant = entry.get("participant")
        if not participant:
            continue

        summary = totals.setdefault(
            participant,
            {
                "participant": participant,
                "message_count": 0,
                "first_message_at": None,
                "last_message_at": None,
                "total_input_cost": 0.0,
                "total_output_cost": 0.0,
                "total_cost": 0.0,
            },
        )

        summary["message_count"] += 1
        occurred_at = entry.get("occurred_at")
        if isinstance(occurred_at, str):
            if summary["first_message_at"] is None or occurred_at < summary["first_message_at"]:
                summary["first_message_at"] = occurred_at
            if summary["last_message_at"] is None or occurred_at > summary["last_message_at"]:
                summary["last_message_at"] = occurred_at

        for key, summary_key in [
            ("input_cost", "total_input_cost"),
            ("output_cost", "total_output_cost"),
            ("total_cost", "total_cost"),
        ]:
            value = entry.get(key)
            if isinstance(value, (int, float)):
                summary[summary_key] += value

    return sorted(totals.values(), key=lambda item: item["participant"])


def compute_last_updated(interactions: Sequence[Dict[str, object]]) -> Optional[str]:
    dates = [
        entry["message_date"]
        for entry in interactions
        if isinstance(entry.get("message_date"), str)
    ]
    if not dates:
        return None
    return max(dates)


def write_dataset(
    output_dir: Path,
    dataset_key: str,
    interactions: Sequence[Dict[str, object]],
    *,
    source: Path,
    generated_at: datetime,
) -> None:
    metadata = {
        "dataset": dataset_key,
        "generated_at": generated_at.replace(microsecond=0).isoformat(),
        "source_workbook": str(source),
        "record_count": len(interactions),
        "last_updated": compute_last_updated(interactions),
    }
    participants = build_participant_summaries(interactions)

    payload = {
        "meta": metadata,
        "interactions": interactions,
        "participants": participants,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{dataset_key}.json"
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    print(f"[ingest] wrote {output_path} ({metadata['record_count']} records)")


def filter_interactions(
    interactions: Sequence[Dict[str, object]],
    *,
    exclude_participants: Iterable[str] = (),
) -> List[Dict[str, object]]:
    excluded = {participant.lower() for participant in exclude_participants}
    if not excluded:
        return list(interactions)
    return [
        record
        for record in interactions
        if isinstance(record.get("participant"), str)
        and record["participant"].lower() not in excluded
    ]


def main() -> None:
    args = parse_args()
    source_path: Path = args.source
    if not source_path.exists():
        raise SystemExit(f"Source workbook not found: {source_path}")

    with zipfile.ZipFile(source_path) as zf:
        shared_strings = load_shared_strings(zf)
        sheet_mapping = map_sheet_names(zf)
        if args.sheet not in sheet_mapping:
            available = ", ".join(sorted(sheet_mapping))
            raise SystemExit(f"Sheet '{args.sheet}' not found. Available: {available}")

        sheet_path = sheet_mapping[args.sheet]
        rows = extract_rows(zf, sheet_path, shared_strings)
        raw_records = parse_interactions(rows)
        normalized = [normalize_interaction(record) for record in raw_records]

    generated_at = datetime.now(timezone.utc)
    write_dataset(
        args.output,
        f"{args.dataset_prefix}_all",
        normalized,
        source=source_path,
        generated_at=generated_at,
    )

    if args.exclude:
        trimmed = filter_interactions(normalized, exclude_participants=args.exclude)
        write_dataset(
            args.output,
            f"{args.dataset_prefix}_exclude",
            trimmed,
            source=source_path,
            generated_at=generated_at,
        )


if __name__ == "__main__":
    main()
