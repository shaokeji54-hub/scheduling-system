import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import ForecastPage from "./pages/ForecastPage";
import HourlyRequirementPage from "./pages/HourlyRequirementPage";
import ScheduleBoardPage from "./pages/ScheduleBoardPage";
import LeaveManagementPage from "./pages/LeaveManagementPage";
import MySchedulePage from "./pages/MySchedulePage";
import PositionManagementPage from "./pages/PositionManagementPage";
import AdjustmentLogPage from "./pages/AdjustmentLogPage";
import ProductivityMappingPage from "./pages/ProductivityMappingPage";
import AppLayout from "./components/AppLayout";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<ProtectedRoute roles={["scheduler"]}><EmployeeManagementPage /></ProtectedRoute>} />
        <Route path="forecasts" element={<ProtectedRoute roles={["scheduler"]}><ForecastPage /></ProtectedRoute>} />
        <Route path="hourly-requirements" element={<ProtectedRoute roles={["scheduler"]}><HourlyRequirementPage /></ProtectedRoute>} />
        <Route path="schedule-board" element={<ProtectedRoute roles={["scheduler"]}><ScheduleBoardPage /></ProtectedRoute>} />
        <Route path="leaves" element={<ProtectedRoute roles={["scheduler"]}><LeaveManagementPage /></ProtectedRoute>} />
        <Route path="my-schedule" element={<ProtectedRoute><MySchedulePage /></ProtectedRoute>} />
        <Route path="adjustment-logs" element={<ProtectedRoute roles={["scheduler"]}><AdjustmentLogPage /></ProtectedRoute>} />
        <Route path="positions" element={<ProtectedRoute roles={["scheduler"]}><PositionManagementPage /></ProtectedRoute>} />
        <Route path="productivity" element={<ProtectedRoute roles={["scheduler"]}><ProductivityMappingPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
