#!/usr/bin/env python3
"""Local Streamlit utility for categorizing SUDCare chatbot transcripts."""

from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Any, Callable, Optional

import pandas as pd
import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MODEL = "gpt-5.5"

CATEGORY_VALUES = [
    "appointments",
    "cravings",
    "facilities & resources",
    "other",
    "wellness",
]

OTHER_LABEL_VALUES = [
    "bot meta (identity, capabilities, tone/feedback",
    "career/education inquiry",
    "consent/program/privacy",
    "dating/relationships",
    "declines support",
    "financial concerns",
    "food & diet",
    "frustration/dissatisfaction",
    "general conversation",
    "gratitude/acknowledgment",
    "greeting & politeness",
    "health & medical (incl. substances)",
    "information lookup & learning",
    "provider contact information",
    "reminders & scheduling",
    "technical support",
    "unclear/ambiguous message",
]

TARGET_COLUMNS = [
    "category",
    "other_label",
    "category_justification",
    "satisfied",
    "satisfaction_justification",
]

EVALUATION_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "enum": CATEGORY_VALUES,
        },
        "other_label": {
            "anyOf": [
                {
                    "type": "string",
                    "enum": OTHER_LABEL_VALUES,
                },
                {"type": "null"},
            ],
        },
        "category_justification": {
            "type": "string",
        },
        "satisfied": {
            "type": "boolean",
        },
        "satisfaction_justification": {
            "type": "string",
        },
    },
    "required": TARGET_COLUMNS,
    "additionalProperties": False,
}

SYSTEM_PROMPT = """
You are an evaluator for one partial transcript row from a SUDCare chatbot study.

Study context:
- The transcript comes from a 12-week study of specialized chatbot support while users undergo MOUD treatment for opioid addiction.
- The chatbot is acting as a virtual peer recovery coach.
- You will see only one user message and one chatbot response. Do not infer from prior or later rows.

Your task:
1. Choose exactly one interaction category:
   - appointments
   - cravings
   - facilities & resources
   - other
   - wellness
2. If and only if category is "other", choose one other_label from the provided enum. Otherwise set other_label to null.
3. Write category_justification as one concise line explaining the category and, when applicable, the other_label.
4. Decide satisfied as true when the chatbot response substantially satisfied the user's immediate intent. If the user asked for x, did the response provide x or a clearly useful next step?
5. Write satisfaction_justification as one concise line explaining the satisfied value.

Use the transcript content as the evidence. Be clinically careful, but evaluate intent satisfaction rather than whether the bot's advice is perfect.
""".strip()


def normalize_column_name(raw: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "_" for ch in str(raw).strip().lower())
    return "_".join(part for part in cleaned.split("_") if part)


def column_lookup(df: pd.DataFrame) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for column in df.columns:
        normalized = normalize_column_name(column)
        if normalized and normalized not in lookup:
            lookup[normalized] = column
    return lookup


def ensure_target_columns(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()
    for column in TARGET_COLUMNS:
        if column not in output.columns:
            output[column] = ""
    return output


def required_transcript_columns(df: pd.DataFrame) -> tuple[str, str]:
    lookup = column_lookup(df)
    missing: list[str] = []
    input_column = lookup.get("input_message")
    response_column = lookup.get("response_message")

    if input_column is None:
        missing.append("input-message")
    if response_column is None:
        missing.append("response-message")
    if missing:
        raise ValueError(f"CSV is missing required column(s): {', '.join(missing)}")

    return input_column, response_column


def is_blank(value: Any) -> bool:
    if value is None:
        return True
    return str(value).strip() == ""


def row_needs_evaluation(row: pd.Series, overwrite: bool) -> bool:
    if overwrite:
        return True
    return any(is_blank(row.get(column, "")) for column in TARGET_COLUMNS)


def processable_row_indices(
    df: pd.DataFrame,
    *,
    input_column: str,
    response_column: str,
    overwrite: bool,
) -> list[int]:
    indices: list[int] = []
    for idx, row in df.iterrows():
        if is_blank(row.get(input_column, "")) and is_blank(row.get(response_column, "")):
            continue
        if row_needs_evaluation(row, overwrite):
            indices.append(idx)
    return indices


class CategorizationError(RuntimeError):
    def __init__(self, message: str, partial: pd.DataFrame) -> None:
        super().__init__(message)
        self.partial = partial


def read_csv(uploaded_file: Any) -> pd.DataFrame:
    return pd.read_csv(uploaded_file, dtype=str, keep_default_na=False, encoding="utf-8-sig")


def build_user_prompt(row: pd.Series, *, input_column: str, response_column: str) -> str:
    message_id = ""
    for column in row.index:
        if normalize_column_name(column) == "message_id":
            message_id = str(row.get(column, "")).strip()
            break

    user_message = str(row.get(input_column, "")).strip()
    bot_response = str(row.get(response_column, "")).strip()

    return f"""
Evaluate this transcript row.

message_id: {message_id}

input-message:
{user_message}

response-message:
{bot_response}
""".strip()


def extract_output_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    output = getattr(response, "output", None) or []
    fragments: list[str] = []
    for item in output:
        content = getattr(item, "content", None) or []
        for part in content:
            text = getattr(part, "text", None)
            if isinstance(text, str):
                fragments.append(text)
    return "".join(fragments)


def normalize_one_line(value: Any) -> str:
    return " ".join(str(value).split())


def validate_evaluation(data: dict[str, Any]) -> dict[str, Any]:
    category = data.get("category")
    if category not in CATEGORY_VALUES:
        raise ValueError(f"Unexpected category: {category}")

    other_label = data.get("other_label")
    if category == "other":
        if other_label not in OTHER_LABEL_VALUES:
            raise ValueError(f"Unexpected other_label for 'other': {other_label}")
    else:
        other_label = ""

    satisfied = data.get("satisfied")
    if not isinstance(satisfied, bool):
        raise ValueError("satisfied must be a boolean")

    return {
        "category": category,
        "other_label": other_label or "",
        "category_justification": normalize_one_line(data.get("category_justification", "")),
        "satisfied": "TRUE" if satisfied else "FALSE",
        "satisfaction_justification": normalize_one_line(data.get("satisfaction_justification", "")),
    }


def evaluate_row(
    client: OpenAI,
    row: pd.Series,
    *,
    model: str,
    input_column: str,
    response_column: str,
) -> dict[str, Any]:
    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(
                    row,
                    input_column=input_column,
                    response_column=response_column,
                ),
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "sudcare_interaction_evaluation",
                "schema": EVALUATION_SCHEMA,
                "strict": True,
            },
        },
        store=False,
        max_output_tokens=512,
    )

    if getattr(response, "status", None) not in (None, "completed"):
        raise RuntimeError(f"OpenAI response ended with status: {response.status}")

    output_text = extract_output_text(response)
    if not output_text.strip():
        raise RuntimeError("OpenAI response did not include structured output text")

    return validate_evaluation(json.loads(output_text))


def categorize_dataframe(
    df: pd.DataFrame,
    *,
    client: OpenAI,
    model: str,
    input_column: str,
    response_column: str,
    indices: list[int],
    parallel_workers: int = 1,
    progress_callback: Optional[Callable[[int, int], None]] = None,
    status_callback: Optional[Callable[[str], None]] = None,
) -> pd.DataFrame:
    output = df.copy()
    total = len(indices)
    worker_count = max(1, min(10, int(parallel_workers)))

    if total == 0:
        return output

    if status_callback:
        status_callback(f"Categorizing {total} rows with {worker_count} parallel API call(s)")

    failures: list[str] = []
    finished = 0
    row_payloads = {idx: output.loc[idx].copy() for idx in indices}

    def evaluate_index(idx: int) -> tuple[int, dict[str, Any]]:
        evaluation = evaluate_row(
            client,
            row_payloads[idx],
            model=model,
            input_column=input_column,
            response_column=response_column,
        )
        return idx, evaluation

    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = {executor.submit(evaluate_index, idx): idx for idx in indices}
        for future in as_completed(futures):
            idx = futures[future]
            try:
                completed_idx, evaluation = future.result()
            except Exception as exc:
                failures.append(f"row {idx}: {exc}")
            else:
                for column, value in evaluation.items():
                    output.at[completed_idx, column] = value

            finished += 1
            if status_callback:
                status_callback(
                    f"Finished {finished} of {total} rows"
                    + (f" ({len(failures)} failed)" if failures else ""),
                )
            if progress_callback:
                progress_callback(finished, total)

    if failures:
        raise CategorizationError(
            f"{len(failures)} row(s) failed. First failure: {failures[0]}",
            output,
        )

    return output


def dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    buffer = StringIO()
    df.to_csv(buffer, index=False)
    return buffer.getvalue().encode("utf-8")


def make_output_filename(input_name: str) -> str:
    stem = Path(input_name).stem or "categorized_messages"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{stem}_categorized_{timestamp}.csv"


@st.cache_resource(show_spinner=False)
def get_client(api_key: str, timeout_seconds: float, max_retries: int) -> OpenAI:
    return OpenAI(api_key=api_key, timeout=timeout_seconds, max_retries=max_retries)


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env")

    st.set_page_config(page_title="SUDCare Message Categorizer", layout="wide")
    st.title("SUDCare Message Categorizer")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        st.error("OPENAI_API_KEY was not found in the repo root .env file.")
        st.stop()

    with st.sidebar:
        model = st.text_input("Model", value=os.getenv("OPENAI_MODEL", DEFAULT_MODEL))
        overwrite = st.checkbox("Overwrite existing metadata", value=False)
        limit_rows = st.number_input("Maximum rows this run", min_value=0, value=0, step=1)
        parallel_workers = st.slider("Parallel API calls", min_value=1, max_value=10, value=5)
        timeout_seconds = st.number_input(
            "OpenAI timeout seconds",
            min_value=30,
            value=int(os.getenv("OPENAI_TIMEOUT_SECONDS", "180")),
            step=30,
        )
        max_retries = st.number_input(
            "OpenAI max retries",
            min_value=0,
            max_value=5,
            value=int(os.getenv("OPENAI_MAX_RETRIES", "2")),
            step=1,
        )

    uploaded_file = st.file_uploader("CSV", type=["csv"])
    if uploaded_file is None:
        st.stop()

    try:
        df = ensure_target_columns(read_csv(uploaded_file))
        input_column, response_column = required_transcript_columns(df)
    except Exception as exc:
        st.error(str(exc))
        st.stop()

    indices = processable_row_indices(
        df,
        input_column=input_column,
        response_column=response_column,
        overwrite=overwrite,
    )
    if limit_rows:
        indices = indices[: int(limit_rows)]

    st.metric("Rows in CSV", len(df))
    st.metric("Rows queued", len(indices))
    st.dataframe(df.head(20), use_container_width=True)

    if not indices:
        st.download_button(
            "Download CSV",
            data=dataframe_to_csv_bytes(df),
            file_name=make_output_filename(uploaded_file.name),
            mime="text/csv",
        )
        st.stop()

    if st.button("Categorize"):
        client = get_client(api_key, float(timeout_seconds), int(max_retries))
        progress = st.progress(0)
        status = st.empty()

        try:
            categorized = categorize_dataframe(
                df,
                client=client,
                model=model.strip() or DEFAULT_MODEL,
                input_column=input_column,
                response_column=response_column,
                indices=indices,
                parallel_workers=int(parallel_workers),
                status_callback=status.write,
                progress_callback=lambda done, total: progress.progress(done / total),
            )
        except CategorizationError as exc:
            st.error(f"Categorization stopped: {exc}")
            st.download_button(
                "Download partial CSV",
                data=dataframe_to_csv_bytes(exc.partial),
                file_name=make_output_filename(uploaded_file.name),
                mime="text/csv",
            )
            st.stop()

        st.success("Categorization complete.")
        st.dataframe(categorized.head(20), use_container_width=True)
        st.download_button(
            "Download CSV",
            data=dataframe_to_csv_bytes(categorized),
            file_name=make_output_filename(uploaded_file.name),
            mime="text/csv",
        )


if __name__ == "__main__":
    main()
