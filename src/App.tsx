import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Login } from './pages/Login';
import { StaffDashboard } from './pages/staff/Dashboard';
import { MyAttendance } from './pages/staff/MyAttendance';
import { CorrectionRequest } from './pages/staff/CorrectionRequest';
import { LeaveRequest } from './pages/staff/LeaveRequest';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminRequests } from './pages/admin/Requests';
import { AdminAttendanceList } from './pages/admin/AttendanceList';
import { AdminLeaveGrants } from './pages/admin/LeaveGrants';
import { AdminMonthlyClosing } from './pages/admin/MonthlyClosing';
import { AdminCsvExport } from './pages/admin/CsvExport';
import { AdminUsers } from './pages/admin/Users';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    secondary: { main: '#e65100' },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* ログイン画面 — ロール別 URL */}
          <Route path="/login/staff" element={<Login redirectTo="/staff" roleLabel="staff" />} />
          <Route path="/login/admin" element={<Login redirectTo="/admin" roleLabel="admin" />} />
          {/* 後方互換: /login は role に応じて自動判定 */}
          <Route path="/login" element={<Login />} />

          {/* スタッフ画面 — admin も入れる */}
          <Route
            path="/staff/*"
            element={
              <PrivateRoute requiredRole="staff" loginPath="/login/staff">
                <Layout>
                  <Routes>
                    <Route index element={<StaffDashboard />} />
                    <Route path="attendance" element={<MyAttendance />} />
                    <Route path="correction" element={<CorrectionRequest />} />
                    <Route path="leave" element={<LeaveRequest />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />

          {/* 管理者画面 — admin のみ */}
          <Route
            path="/admin/*"
            element={
              <PrivateRoute requiredRole="admin" loginPath="/login/admin">
                <Layout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="requests" element={<AdminRequests />} />
                    <Route path="attendance" element={<AdminAttendanceList />} />
                    <Route path="leave-grants" element={<AdminLeaveGrants />} />
                    <Route path="closing" element={<AdminMonthlyClosing />} />
                    <Route path="csv" element={<AdminCsvExport />} />
                    <Route path="users" element={<AdminUsers />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/staff" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
