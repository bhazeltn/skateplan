"""Pure consistency-analytics aggregation for program run-throughs (Sprint 5).

Deterministic math: given ``(run, program)`` pairs, group by program and compute
run/element consistency. The canonical clean outcome string is ``"clean"``
(matching app.services.training_service).
"""
from app.schemas.run_through import (
    ProgramConsistencyOut,
    ProgramElementStatOut,
)
from app.services.training_service import sort_tag_counts

CLEAN = "clean"


def _blank_group(program) -> dict:
    return {
        "program_id": program.id,
        "program_name": program.title,
        "segment": program.program_type,
        "total_runs": 0,
        "full_runs": 0,
        "clean_runs": 0,
        "_elements": {},          # code -> {total, clean, with_calls, tags}
        "_total_elements": 0,
        "_clean_elements": 0,
        "_completed_elements": 0,
    }


def _tally_element(group: dict, res) -> bool:
    """Fold one element result; return True iff it is a true clean (no tags)."""
    tags = res.tags or []
    totals = group["_elements"].setdefault(
        res.element_code, {"total": 0, "clean": 0, "with_calls": 0, "tags": {}}
    )
    totals["total"] += 1
    group["_total_elements"] += 1
    for tag in tags:
        totals["tags"][tag] = totals["tags"].get(tag, 0) + 1
    if res.outcome != CLEAN:
        return False
    group["_completed_elements"] += 1
    if tags:
        totals["with_calls"] += 1
        return False
    totals["clean"] += 1
    group["_clean_elements"] += 1
    return True


def _tally_run(group: dict, run) -> None:
    group["total_runs"] += 1
    if run.run_type == "full":
        group["full_runs"] += 1
    results = run.element_results
    all_clean = bool(results)
    for res in results:
        if not _tally_element(group, res):
            all_clean = False
    if all_clean:
        group["clean_runs"] += 1


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _element_stat(code: str, b: dict) -> ProgramElementStatOut:
    completed = b["clean"] + b["with_calls"]
    return ProgramElementStatOut(
        element_code=code,
        total_attempts=b["total"],
        clean_count=b["clean"],
        with_calls_count=b["with_calls"],
        clean_percentage=_pct(b["clean"], b["total"]),
        completed_percentage=_pct(completed, b["total"]),
        tag_counts=sort_tag_counts(b["tags"]),
    )


def _finalize(group: dict) -> ProgramConsistencyOut:
    stats = [_element_stat(code, b) for code, b in group["_elements"].items()]
    stats.sort(key=lambda s: s.total_attempts, reverse=True)
    return ProgramConsistencyOut(
        program_id=group["program_id"],
        program_name=group["program_name"],
        segment=group["segment"],
        total_runs=group["total_runs"],
        full_runs=group["full_runs"],
        clean_runs=group["clean_runs"],
        overall_clean_percentage=_pct(group["_clean_elements"], group["_total_elements"]),
        overall_completed_percentage=_pct(
            group["_completed_elements"], group["_total_elements"]
        ),
        element_stats=stats,
    )


def aggregate_program_stats(runs_with_programs) -> list[ProgramConsistencyOut]:
    """Group ``(run, program)`` pairs by program and compute consistency stats."""
    groups: dict = {}
    for run, program in runs_with_programs:
        group = groups.get(program.id)
        if group is None:
            group = groups[program.id] = _blank_group(program)
        _tally_run(group, run)
    return [_finalize(g) for g in groups.values()]
