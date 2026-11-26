import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useYtp } from "@/components/ytp/useYtp";
import { useSkaterBenchmarks } from "@/components/gap/useSkaterBenchmarks";
import { useSkaterEntries } from "@/components/skaters/useSkaterEntries";
import { YtpToolbar } from "@/components/ytp/YtpToolbar";
import { YtpTimeline, type TimelineCompetition } from "@/components/ytp/YtpTimeline";
import { YtpPhaseCard } from "@/components/ytp/YtpPhaseCard";
import { YtpGapsSidebar } from "@/components/ytp/YtpGapsSidebar";
import { PlanModal } from "@/components/ytp/PlanModal";
import { PhaseModal } from "@/components/ytp/PhaseModal";
import type {
  YearlyPlanCreate,
  YearlyPlanOut,
  YearlyPlanUpdate,
  YtpPhaseCreate,
  YtpPhaseOut,
} from "@/lib/ytpApi";

type ModalState =
  | { kind: "plan"; plan?: YearlyPlanOut }
  | { kind: "phase"; phase?: YtpPhaseOut }
  | null;

/** The Season Plan tab: periodised yearly plan with a visual timeline, phase
 *  cards and a gap-coverage sidebar for one skater. */
export function YtpTab({
  skaterId,
  canEdit = true,
}: {
  skaterId: number;
  canEdit?: boolean;
}) {
  const {
    plans,
    activePlanId,
    setActivePlanId,
    loading,
    error,
    createPlan,
    updatePlan,
    removePlan,
    addPhase,
    editPhase,
    removePhase,
  } = useYtp(skaterId);
  const { items: benchmarks } = useSkaterBenchmarks(skaterId);
  const { items: entries } = useSkaterEntries(skaterId);
  const [modal, setModal] = useState<ModalState>(null);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  const competitions = useMemo<TimelineCompetition[]>(
    () =>
      entries
        .filter((e) => e.competition?.start_date)
        .map((e) => ({
          name: e.competition?.name ?? "Competition",
          date: e.competition!.start_date as string,
        })),
    [entries]
  );

  const sortedPhases = useMemo(
    () =>
      activePlan
        ? [...activePlan.phases].sort((a, b) => a.start_date.localeCompare(b.start_date))
        : [],
    [activePlan]
  );

  const handleDeletePlan = () => {
    if (!activePlan) return;
    if (window.confirm(`Delete "${activePlan.title}"? All its phases are removed.`)) {
      void removePlan(activePlan.id);
    }
  };

  const submitPlan = async (payload: YearlyPlanCreate | YearlyPlanUpdate) => {
    if (modal?.kind === "plan" && modal.plan) {
      await updatePlan(modal.plan.id, payload);
    } else {
      await createPlan(payload as YearlyPlanCreate);
    }
  };

  const submitPhase = async (payload: YtpPhaseCreate) => {
    if (!activePlan) return;
    if (modal?.kind === "phase" && modal.phase) {
      await editPhase(modal.phase.id, payload);
    } else {
      await addPhase(activePlan.id, payload);
    }
  };

  if (loading) {
    return <p className="p-4 text-sm text-slate-400">Loading season plans…</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">No season plan yet.</p>
          {canEdit && (
            <Button type="button" className="mt-4" onClick={() => setModal({ kind: "plan" })}>
              + Create Season Plan
            </Button>
          )}
        </div>
      ) : (
        <>
          <YtpToolbar
            plans={plans}
            activePlanId={activePlanId}
            onSelect={setActivePlanId}
            onNew={() => setModal({ kind: "plan" })}
            onEdit={() => activePlan && setModal({ kind: "plan", plan: activePlan })}
            onDelete={handleDeletePlan}
            canEdit={canEdit}
          />

          {activePlan ? (
            <>
              <YtpTimeline
                plan={activePlan}
                competitions={competitions}
                onPhaseClick={(phase) => setModal({ kind: "phase", phase })}
              />

              <div className="grid grid-cols-1 gap-6 items-start lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Phases ({sortedPhases.length})
                    </h3>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setModal({ kind: "phase" })}
                      >
                        + Add Phase
                      </Button>
                    )}
                  </div>
                  {sortedPhases.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                      No phases yet — add the first block of the season.
                    </p>
                  ) : (
                    sortedPhases.map((phase) => (
                      <YtpPhaseCard
                        key={phase.id}
                        phase={phase}
                        benchmarks={benchmarks}
                        competitions={competitions}
                        onEdit={(p) => setModal({ kind: "phase", phase: p })}
                        onDelete={(p) => void removePhase(p.id)}
                        canEdit={canEdit}
                      />
                    ))
                  )}
                </div>
                <YtpGapsSidebar benchmarks={benchmarks} phases={activePlan.phases} />
              </div>
            </>
          ) : null}
        </>
      )}

      {modal?.kind === "plan" ? (
        <PlanModal
          initialPlan={modal.plan}
          onClose={() => setModal(null)}
          onSubmit={submitPlan}
        />
      ) : null}
      {modal?.kind === "phase" && activePlan ? (
        <PhaseModal
          planStart={activePlan.start_date}
          planEnd={activePlan.end_date}
          initialPhase={modal.phase}
          benchmarks={benchmarks}
          onClose={() => setModal(null)}
          onSubmit={submitPhase}
        />
      ) : null}
    </div>
  );
}
