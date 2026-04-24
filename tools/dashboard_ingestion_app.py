#!/usr/bin/env python3
"""Local Streamlit utility for dashboard dataset ingestion."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import streamlit as st


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.ingest_dashboard_data import ingest_workbook, map_sheet_names  # noqa: E402


DEFAULT_WORKBOOK_PATH = PROJECT_ROOT / "docs/SUDCare Dashboard v0 Dataset.xlsx"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data/normalized"
DEFAULT_SHEET = "merged_data-all"
DEFAULT_DATASET_PREFIX = "sudcare"


def resolve_repo_path(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def parse_exclusions(raw_value: str) -> list[str]:
    normalized = raw_value.replace(",", "\n")
    return [part.strip() for part in normalized.splitlines() if part.strip()]


def dataset_prefix(raw_value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in {"_", "-"} else "_" for ch in raw_value.strip())
    cleaned = "_".join(part for part in cleaned.split("_") if part)
    if not cleaned:
        raise ValueError("Dataset prefix cannot be blank.")
    return cleaned


def list_sheet_names_from_path(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as zf:
        return sorted(map_sheet_names(zf))


def list_sheet_names_from_bytes(content: bytes) -> list[str]:
    with zipfile.ZipFile(BytesIO(content)) as zf:
        return sorted(map_sheet_names(zf))


def summarize_dataset(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    meta = payload.get("meta", {})
    participants = payload.get("participants", [])
    return {
        "file": path.name,
        "path": str(path),
        "dataset": meta.get("dataset"),
        "records": meta.get("record_count"),
        "participants": len(participants) if isinstance(participants, list) else None,
        "last_updated": meta.get("last_updated"),
    }


def promote_outputs(outputs: dict[str, Path]) -> dict[str, Path]:
    promoted: dict[str, Path] = {}
    all_output = outputs.get("all")
    if all_output:
        target = PROJECT_ROOT / "data/data-all.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(all_output, target)
        promoted["all"] = target

    exclude_output = outputs.get("exclude")
    if exclude_output:
        target = PROJECT_ROOT / "data/data-exclude-p266.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(exclude_output, target)
        promoted["exclude"] = target

    return promoted


def write_uploaded_workbook(content: bytes, original_name: str, temp_dir: Path) -> Path:
    suffix = Path(original_name).suffix or ".xlsx"
    path = temp_dir / f"uploaded_workbook{suffix}"
    path.write_bytes(content)
    return path


def main() -> None:
    st.set_page_config(page_title="SUDCare Dashboard Ingestion", layout="wide")
    st.title("SUDCare Dashboard Ingestion")

    source_mode = st.radio(
        "Workbook source",
        ["Upload workbook", "Use local path"],
        horizontal=True,
    )

    workbook_content: Optional[bytes] = None
    local_source_path: Optional[Path] = None
    sheet_names: list[str] = []

    if source_mode == "Upload workbook":
        uploaded_file = st.file_uploader("Excel workbook", type=["xlsx"])
        if uploaded_file is not None:
            workbook_content = uploaded_file.getvalue()
            try:
                sheet_names = list_sheet_names_from_bytes(workbook_content)
            except Exception as exc:
                st.error(f"Unable to inspect workbook sheets: {exc}")
                st.stop()
        else:
            uploaded_file = None
    else:
        default_path = str(DEFAULT_WORKBOOK_PATH.relative_to(PROJECT_ROOT))
        source_input = st.text_input("Workbook path", value=default_path)
        local_source_path = resolve_repo_path(source_input)
        if local_source_path.exists():
            try:
                sheet_names = list_sheet_names_from_path(local_source_path)
            except Exception as exc:
                st.error(f"Unable to inspect workbook sheets: {exc}")
                st.stop()
        elif source_input.strip():
            st.warning(f"Workbook not found: {local_source_path}")

    with st.sidebar:
        output_input = st.text_input(
            "Output directory",
            value=str(DEFAULT_OUTPUT_DIR.relative_to(PROJECT_ROOT)),
        )
        prefix_input = st.text_input("Dataset prefix", value=DEFAULT_DATASET_PREFIX)
        exclusions_input = st.text_area("Exclude participants", value="p266", height=90)
        promote_to_live = st.checkbox("Promote generated files to live dashboard data", value=False)

    if sheet_names:
        default_index = sheet_names.index(DEFAULT_SHEET) if DEFAULT_SHEET in sheet_names else 0
        sheet_name = st.selectbox("Worksheet", sheet_names, index=default_index)
    else:
        sheet_name = st.text_input("Worksheet", value=DEFAULT_SHEET)

    output_dir = resolve_repo_path(output_input)
    exclusions = parse_exclusions(exclusions_input)

    st.write(
        {
            "output_directory": str(output_dir),
            "dataset_prefix": prefix_input,
            "excluded_participants": exclusions,
            "promote_to_live_dashboard_data": promote_to_live,
        },
    )

    can_ingest = workbook_content is not None or (local_source_path is not None and local_source_path.exists())
    if not can_ingest:
        st.stop()

    if st.button("Generate dashboard datasets"):
        try:
            prefix = dataset_prefix(prefix_input)
            with tempfile.TemporaryDirectory(prefix="sudcare-ingest-") as temp_name:
                if workbook_content is not None:
                    source_name = uploaded_file.name if uploaded_file is not None else "uploaded.xlsx"
                    source_path = write_uploaded_workbook(
                        workbook_content,
                        source_name,
                        Path(temp_name),
                    )
                else:
                    if local_source_path is None:
                        raise ValueError("No workbook source selected.")
                    source_path = local_source_path

                outputs = ingest_workbook(
                    source_path=source_path,
                    output_dir=output_dir,
                    dataset_prefix=prefix,
                    exclude_participants=exclusions,
                    sheet=sheet_name,
                )

            summaries = [summarize_dataset(path) for path in outputs.values()]
            st.success("Dashboard datasets generated.")
            st.dataframe(summaries, use_container_width=True)

            if promote_to_live:
                promoted = promote_outputs(outputs)
                if promoted:
                    st.info(
                        "Promoted files: "
                        + ", ".join(f"{name}: {path}" for name, path in promoted.items()),
                    )

            for name, path in outputs.items():
                st.download_button(
                    f"Download {name} dataset",
                    data=path.read_bytes(),
                    file_name=path.name,
                    mime="application/json",
                )
        except Exception as exc:
            st.error(f"Ingestion failed: {exc}")


if __name__ == "__main__":
    main()
