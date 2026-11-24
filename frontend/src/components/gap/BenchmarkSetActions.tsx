import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApplyBenchmarkSetModal } from "@/components/gap/ApplyBenchmarkSetModal";
import { SaveAsSetModal } from "@/components/gap/SaveAsSetModal";
import { ManageBenchmarkSetsModal } from "@/components/gap/ManageBenchmarkSetsModal";
import type { ApplySetResult } from "@/lib/benchmarkSetsApi";
import type { SkaterBenchmark } from "@/lib/types";

type Modal = "apply" | "save" | "manage" | null;

interface Props {
  skaterId: number | string;
  benchmarks: SkaterBenchmark[];
  onApplied: (result: ApplySetResult) => void;
}

/** Secondary actions for reusable benchmark sets: apply one to this skater,
 *  save the current benchmarks as a set, or manage the coach's sets. */
export function BenchmarkSetActions({ skaterId, benchmarks, onApplied }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const close = () => setModal(null);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setModal("apply")}>
        Apply Set
      </Button>
      {benchmarks.length > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setModal("save")}>
          Save as Set
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={() => setModal("manage")}>
        Manage Sets
      </Button>

      {modal === "apply" ? (
        <ApplyBenchmarkSetModal
          skaterId={skaterId}
          onClose={close}
          onApplied={onApplied}
          onManage={() => setModal("manage")}
        />
      ) : null}
      {modal === "save" ? (
        <SaveAsSetModal benchmarks={benchmarks} onClose={close} onSaved={close} />
      ) : null}
      {modal === "manage" ? <ManageBenchmarkSetsModal onClose={close} /> : null}
    </>
  );
}
