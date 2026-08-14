import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState('admin@dar-alunotha.ly');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card stack" onSubmit={onSubmit}>
        <div>
          <div className="brand-kicker" style={{ color: 'var(--primary-container)', opacity: 1 }}>
            نظام إدارة التجارة المركزية
          </div>
          <h1>دار الأنوثة</h1>
          <p>تسجيل الدخول لإدارة المبيعات والمخزون والتوصيل — طرابلس، ليبيا</p>
        </div>
        <label>
          البريد الإلكتروني
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="username"
          />
        </label>
        <label>
          كلمة المرور
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'جارٍ الدخول...' : 'دخول'}
        </button>
        <a href="/register-marketer" style={{ textAlign: 'center' }}>
          تسجيل مسوق جديد (طرابلس)
        </a>
      </form>
    </div>
  );
}
