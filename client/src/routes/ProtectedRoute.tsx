// Wraps pages that need a signed-in player. Others are sent to Sign in.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext.tsx';
import { paths } from './paths.ts';

export function ProtectedRoute() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'checking') return <p className="status-message" role="status">Loading…</p>;
  if (status !== 'signed_in') return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
