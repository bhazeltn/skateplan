import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSkaterRole } from "@/components/layout/navItems";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AcceptInvitePage } from "@/pages/AcceptInvitePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { SkatersPage } from "@/pages/SkatersPage";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";
import { CompetitionsPage } from "@/components/competitions/CompetitionsPage";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

/** Athletes have no roster/dashboard home — send them to their own profile. */
function CoachOnlyLanding({ children }: { children: ReactNode }) {
  const { role, userId } = useAuth();
  if (isSkaterRole(role) && userId != null) {
    return <Navigate to={`/skaters/${userId}`} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CoachOnlyLanding>
              <DashboardPage />
            </CoachOnlyLanding>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skaters"
        element={
          <ProtectedRoute>
            <CoachOnlyLanding>
              <SkatersPage />
            </CoachOnlyLanding>
          </ProtectedRoute>
        }
      />
      <Route
        path="/skaters/:id"
        element={
          <ProtectedRoute>
            <SkaterProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gap-analysis"
        element={
          <ProtectedRoute>
            <GapAnalysisPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/competitions"
        element={
          <ProtectedRoute>
            <CompetitionsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
