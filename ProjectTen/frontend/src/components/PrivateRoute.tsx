import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireTenant?: boolean;
}

export default function PrivateRoute({ children, requireAdmin, requireTenant }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isTenantUser = Boolean(user?.tenant_id) && user?.username?.startsWith('tenant');

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to={isTenantUser ? '/dashboard' : '/benchmark/models'} replace />;
  }

  if (requireTenant && !(user?.role === 'admin' || isTenantUser)) {
    return <Navigate to="/benchmark/models" replace />;
  }

  return <>{children}</>;
}
