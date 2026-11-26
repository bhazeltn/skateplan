import { CustomBenchmarksPanel } from "@/components/gap/CustomBenchmarksPanel";

/** Coach-driven Gap Analysis view for one athlete: the coach-defined custom
 *  benchmark matrix (add targets, toggle status inline, roll up met vs gaps).
 *  The retired four-pillar "Competitive Standard Assessment" has been removed. */
export function GapAnalysisTab({
  skaterId,
  canEdit = true,
}: {
  skaterId: number | string;
  canEdit?: boolean;
}) {
  return <CustomBenchmarksPanel skaterId={skaterId} canEdit={canEdit} />;
}
