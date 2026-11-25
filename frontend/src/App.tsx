import { Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { SkatersPage } from "@/pages/SkatersPage";
import { GapAnalysisPage } from "@/pages/GapAnalysisPage";
import { CompetitionsPage } from "@/components/competitions/CompetitionsPage";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
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
            <SkatersPage />
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
