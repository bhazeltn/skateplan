"""Pure consistency-analytics aggregation for program run-throughs (Sprint 5).

Deterministic math: given ``(run, program)`` pairs, group by program and compute
run/element consistency. The canonical clean outcome string is ``"clean"``
(matching app.services.training_service).
"""
from app.schemas.run_through import (
    ProgramConsistencyOut,
    ProgramElementStatOut,
)

CLEAN = "clean"


def _blank_group(program) -> dict:
    return {
        "program_id": program.id,
        "program_name": program.title,
        "segment": program.program_type,
        "total_runs": 0,
        "full_runs": 0,
        "clean_runs": 0,
        "_elements": {},          # code -> [total, clean]
        "_total_elements": 0,
        "_clean_elements": 0,
    }


def _tally_run(group: dict, run) -> None:
    group["total_runs"] += 1
    if run.run_type == "full":
        group["full_runs"] += 1
    results = run.element_results
    all_clean = bool(results)
    for res in results:
        totals = group["_elements"].setdefault(res.element_code, [0, 0])
        totals[0] += 1
        group["_total_elements"] += 1
        if res.outcome == CLEAN:
            totals[1] += 1
            group["_clean_elements"] += 1
        else:
            all_clean = False
    if all_clean:
        group["clean_runs"] += 1


def _pct(part: int, whole: int) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def _finalize(group: dict) -> ProgramConsistencyOut:
    stats = [
        ProgramElementStatOut(
            element_code=code,
            total_attempts=total,
            clean_count=clean,
            clean_percentage=_pct(clean, total),
        )
        for code, (total, clean) in group["_elements"].items()
    ]
    stats.sort(key=lambda s: s.total_attempts, reverse=True)
    return ProgramConsistencyOut(
        program_id=group["program_id"],
        program_name=group["program_name"],
        segment=group["segment"],
        total_runs=group["total_runs"],
        full_runs=group["full_runs"],
        clean_runs=group["clean_runs"],
        overall_clean_percentage=_pct(group["_clean_elements"], group["_total_elements"]),
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
