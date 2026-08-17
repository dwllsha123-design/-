import { Navigate } from 'react-router-dom';
import { isBranchUser, useAuth } from '../auth/AuthContext';
import { PosPage } from './PosPage';

export function BranchPosPage() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="login-page">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isBranchUser(user)) return <Navigate to="/" replace />;

  const typeLabel =
    user.branch?.type === 'WHOLESALE_RETAIL' ? 'جملة وقطاعي' : 'قطاعي فقط';

  return (
    <div className="driver-shell">
      <header className="driver-head">
        <div>
          <strong>{user.branch?.name || user.name}</strong>
          <div className="muted">نقطة بيع الفرع — {typeLabel}</div>
        </div>
        <button className="btn ghost" type="button" onClick={logout}>
          خروج
        </button>
      </header>
      <PosPage embedded />
    </div>
  );
}
