import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import WorkspacePage from "./pages/WorkspacePage";
import { AppShell } from "./components/shell/AppShell";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:projectId" element={<WorkspacePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
