import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Login } from './pages/Login';
import { StaffDashboard } from './pages/staff/Dashboard';
import { AdminDashboard } from './pages/admin/Dashboard';
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
          <Route path="/login" element={<Login />} />

          <Route
            path="/staff/*"
            element={
              <PrivateRoute requiredRole="staff">
                <Layout>
                  <Routes>
                    <Route index element={<StaffDashboard />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <PrivateRoute requiredRole="admin">
                <Layout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
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
