import { useState } from "react";
import type { SkaterProgram } from "@/lib/types";
import {
  ProgramBuilder,
  type InitialProgramData,
} from "@/components/programs/ProgramBuilder";
import { ProgramCard } from "@/components/skaters/ProgramCard";
import { getProgram, deleteProgram, updateProgramMeta } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type LoadedElement = { element_code: string; is_second_half_bonus: boolean };

export function ProgramsTab({
  skaterId,
  programs,
  onProgramSaved,
}: {
  skaterId: number;
  programs: SkaterProgram[];
  onProgramSaved: () => void;
}) {
  const { token } = useAuth();
  const [building, setBuilding] = useState(false);
  const [editingProgram, setEditingProgram] = useState<InitialProgramData | null>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
  const [loadedElements, setLoadedElements] = useState<Record<string, LoadedElement[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function loadElements(programId: string): Promise<LoadedElement[]> {
    const detail = await getProgram(programId, token);
    return [...(detail.program_elements || [])].sort(
      (a, b) => a.segment_order - b.segment_order
    );
  }

  async function handleToggleExpand(programId: string) {
    if (expandedProgramId === programId) {
      setExpandedProgramId(null);
      return;
    }
    setExpandedProgramId(programId);
    if (!loadedElements[programId]) {
      setLoadingId(programId);
      try {
        const sorted = await loadElements(programId);
        setLoadedElements((prev) => ({ ...prev, [programId]: sorted }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  async function handleEdit(p: SkaterProgram) {
    setLoadingId(p.id);
    try {
      const sorted = await loadElements(p.id);
      setEditingProgram({
        id: p.id,
        program_type: (p.program_type as "SP" | "FS") || "SP",
        title: p.title,
        elements: sorted.map((e) => ({
          element_code: e.element_code,
          is_second_half_bonus: e.is_second_half_bonus,
        })),
      });
      setBuilding(false);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(programId: string) {
    if (!confirm("Are you sure you want to delete this program?")) return;
    await deleteProgram(programId, token);
    onProgramSaved();
  }

  async function handleArchiveToggle(p: SkaterProgram) {
    await updateProgramMeta(p.id, { is_archived: !p.is_archived }, token);
    onProgramSaved();
  }

  function renderCard(p: SkaterProgram) {
    return (
      <ProgramCard
        key={p.id}
        program={p}
        isExpanded={expandedProgramId === p.id}
        elements={loadedElements[p.id]}
        isLoading={loadingId === p.id}
        onToggleExpand={() => handleToggleExpand(p.id)}
        onEdit={() => handleEdit(p)}
        onDelete={() => handleDelete(p.id)}
        onArchiveToggle={() => handleArchiveToggle(p)}
      />
    );
  }

  const active = programs.filter((p) => !p.is_archived);
  const archived = programs.filter((p) => p.is_archived);
  const showList = !building && !editingProgram;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Program layouts</h2>
        {showList && (
          <button
            type="button"
            onClick={() => {
              setEditingProgram(null);
              setBuilding(true);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
              font-medium text-slate-700 hover:bg-slate-50"
          >
            + Build New Program
          </button>
        )}
      </div>

      {building && (
        <ProgramBuilder
          skaterId={skaterId}
          onSaved={() => {
            setBuilding(false);
            onProgramSaved();
          }}
          onCancel={() => setBuilding(false)}
        />
      )}

      {editingProgram && (
        <ProgramBuilder
          skaterId={skaterId}
          initialProgram={editingProgram}
          onSaved={() => {
            setEditingProgram(null);
            onProgramSaved();
          }}
          onCancel={() => setEditingProgram(null)}
        />
      )}

      {showList && programs.length === 0 && (
        <p className="text-sm text-slate-400">No programs planned yet.</p>
      )}

      {showList && programs.length > 0 && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active
            </h3>
            {active.length > 0 ? (
              <div className="space-y-3">{active.map(renderCard)}</div>
            ) : (
              <p className="text-sm text-slate-400">No active programs.</p>
            )}
          </section>

          {archived.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Archived
              </h3>
              <div className="space-y-3">{archived.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
