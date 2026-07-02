import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { CircularProgress, Box } from '@mui/material';

interface Props {
  children: React.ReactNode;
  requiredRole?: Role;
}

export function PrivateRoute({ children, requiredRole }: Props) {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!firebaseUser || !appUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && appUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
