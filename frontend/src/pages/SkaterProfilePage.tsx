import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getSkater } from "@/lib/api";
import type { SkaterDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProfileHeader } from "@/components/skaters/ProfileHeader";
import { EditSkaterModal } from "@/components/skaters/EditSkaterModal";
import { ProfileTabs, type ProfileTab } from "@/components/skaters/ProfileTabs";
import { ProgramsTab } from "@/components/skaters/ProgramsTab";
import { RestrictionsTab } from "@/components/skaters/RestrictionsTab";
import { GoalsTab } from "@/components/skaters/GoalsTab";
import { GapAnalysisTab } from "@/components/skaters/GapAnalysisTab";
import { CompetitionsTab } from "@/components/skaters/CompetitionsTab";
import { YtpTab } from "@/components/ytp/YtpTab";
import { TrainingTab } from "@/components/training/TrainingTab";
import { SkaterAccessTab } from "@/components/skaters/SkaterAccessTab";
import { useSkaterCapabilities } from "@/components/skaters/useSkaterCapabilities";
import { isSkaterRole } from "@/components/layout/navItems";
import type { SkaterCapabilities } from "@/lib/accessApi";

function buildTabs(
  skater: SkaterDetail,
  onChanged: () => void,
  caps: SkaterCapabilities
): ProfileTab[] {
  const id = skater.skater_id;
  const canEdit = caps.can_edit_plan;
  const tabs: ProfileTab[] = [
    {
      label: "Programs",
      content: (
        <ProgramsTab
          skaterId={id}
          programs={skater.programs}
          onProgramSaved={onChanged}
          canEdit={canEdit}
        />
      ),
    },
    {
      label: "Health & Load",
      content: (
        <RestrictionsTab
          skaterId={id}
          restrictions={skater.restrictions}
          onChanged={onChanged}
        />
      ),
    },
    {
      label: "Goals",
      content: (
        <GoalsTab
          skaterId={id}
          capabilities={{
            can_edit_goals: caps.can_edit_goals,
            can_edit_plan: caps.can_edit_plan,
          }}
        />
      ),
    },
    {
      label: "Gap Analysis",
      content: <GapAnalysisTab skaterId={id} canEdit={canEdit} />,
    },
    {
      label: "Competitions",
      content: (
        <CompetitionsTab skaterId={id} programs={skater.programs} canEdit={canEdit} />
      ),
    },
    {
      label: "Season Plan",
      content: <YtpTab skaterId={id} canEdit={canEdit} />,
    },
    {
      label: "Training",
      content: <TrainingTab skaterId={id} />,
    },
  ];
  if (caps.can_manage_access) {
    tabs.push({ label: "Access", content: <SkaterAccessTab skaterId={id} /> });
  }
  return tabs;
}

export function SkaterProfilePage() {
  const { id } = useParams();
  const { token, role } = useAuth();
  const [skater, setSkater] = useState<SkaterDetail | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const { capabilities } = useSkaterCapabilities(id);
  const initialTab = isSkaterRole(role) ? "Training" : undefined;

  const load = useCallback(() => {
    if (!id) return;
    getSkater(id, token)
      .then(setSkater)
      .catch(() => setError(true));
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="p-6 text-sm text-red-600">Unable to load skater.</p>;
  }
  if (!skater) {
    return <p className="p-6 text-sm text-slate-400">Loading profile…</p>;
  }

  const editAction = capabilities.can_edit_plan ? (
    <Button type="button" variant="outline" onClick={() => setEditing(true)}>
      Edit Profile
    </Button>
  ) : undefined;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <ProfileHeader skater={skater} action={editAction} />
      <ProfileTabs
        tabs={buildTabs(skater, load, capabilities)}
        initialLabel={initialTab}
      />
      {editing && (
        <EditSkaterModal
          open={editing}
          skater={skater}
          onClose={() => setEditing(false)}
          onSaved={setSkater}
        />
      )}
    </main>
  );
}
