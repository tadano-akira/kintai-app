import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { CircularProgress, Box } from '@mui/material';

interface Props {
  children: React.ReactNode;
  requiredRole?: Role;
  /** 未認証時のリダイレクト先 */
  loginPath?: string;
}

export function PrivateRoute({ children, requiredRole, loginPath = '/login' }: Props) {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!firebaseUser || !appUser) {
    return <Navigate to={loginPath} replace />;
  }

  // admin はすべての画面にアクセス可。staff は staff 画面のみ。
  const hasAccess =
    !requiredRole ||
    appUser.role === requiredRole ||
    appUser.role === 'admin';

  if (!hasAccess) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}
