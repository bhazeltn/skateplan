"""Deterministic training analytics (Sprint 4).

Pure Python arithmetic — NO LLM, no randomness. Two aggregations:

* ``calculate_workload_metrics`` — total ice time, session count, average RPE
  and the training workload index = sum(duration_minutes * rpe).
* ``aggregate_attempt_success_rates`` — per element_code totals and clean %.

Interpretation (documented so tests + impl agree): an attempt row may represent
a BATCH via ``attempts_count``. "total attempts" therefore sums ``attempts_count``
across rows for an element; "clean count" sums ``attempts_count`` for rows whose
outcome is exactly ``'clean'``. Clean percentage is rounded to 1 decimal place.
"""


def calculate_workload_metrics(sessions) -> dict:
    """Deterministic workload aggregation over a list of session rows."""
    count = len(sessions)
    total_minutes = sum(s.duration_minutes for s in sessions)
    workload = sum(s.duration_minutes * s.rpe for s in sessions)
    average_rpe = round(sum(s.rpe for s in sessions) / count, 2) if count else 0.0
    return {
        "total_ice_minutes": total_minutes,
        "session_count": count,
        "workload_index": workload,
        "average_rpe": average_rpe,
    }


def _blank_bucket() -> dict:
    return {"total": 0, "clean": 0, "with_calls": 0, "tags": {}}


def _tally_attempt(bucket: dict, attempt) -> None:
    """Fold one (possibly batched) attempt into its element bucket."""
    weight = attempt.attempts_count
    tags = attempt.tags or []
    bucket["total"] += weight
    if attempt.outcome == "clean":
        if tags:
            bucket["with_calls"] += weight
        else:
            bucket["clean"] += weight
    for tag in tags:
        bucket["tags"][tag] = bucket["tags"].get(tag, 0) + weight


def sort_tag_counts(tags: dict) -> dict:
    """Deterministic order: count desc, then tag name asc."""
    return dict(sorted(tags.items(), key=lambda kv: (-kv[1], kv[0])))


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def aggregate_attempt_success_rates(attempts) -> list[dict]:
    """Group attempts by element_code; two-tier clean vs. completed stats."""
    groups: dict[str, dict] = {}
    for a in attempts:
        _tally_attempt(groups.setdefault(a.element_code, _blank_bucket()), a)
    stats = []
    for code in sorted(groups):
        b = groups[code]
        completed = b["clean"] + b["with_calls"]
        stats.append({
            "element_code": code,
            "total_attempts": b["total"],
            "clean_count": b["clean"],
            "with_calls_count": b["with_calls"],
            "clean_percentage": _pct(b["clean"], b["total"]),
            "completed_percentage": _pct(completed, b["total"]),
            "tag_counts": sort_tag_counts(b["tags"]),
        })
    return stats
