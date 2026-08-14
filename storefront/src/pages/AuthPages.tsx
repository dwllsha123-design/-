import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/account" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(phone, password);
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول');
    }
  }

  return (
    <section className="container section" style={{ maxWidth: 480 }}>
      <form className="panel form-grid" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>تسجيل الدخول</h2>
        <label>الهاتف<input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
        <label>كلمة المرور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" type="submit">دخول</button>
        <Link to="/register">إنشاء حساب</Link>
        <Link to="/forgot-password">نسيت كلمة المرور؟</Link>
      </form>
    </section>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/account" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register({ name, phone, password });
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    }
  }

  return (
    <section className="container section" style={{ maxWidth: 480 }}>
      <form className="panel form-grid" onSubmit={onSubmit}>
        <h2 style={{ margin: 0 }}>إنشاء حساب</h2>
        <label>الاسم<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>الهاتف<input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
        <label>كلمة المرور<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" type="submit">تسجيل</button>
        <Link to="/login">لديك حساب؟ دخول</Link>
      </form>
    </section>
  );
}

export function ForgotPasswordPage() {
  return (
    <section className="container section" style={{ maxWidth: 520 }}>
      <div className="panel">
        <h2>نسيت كلمة المرور</h2>
        <p>
          حالياً يمكنكِ استعادة الحساب عبر التواصل مع دار الأنوثة على:
        </p>
        <p><strong>0911820999</strong> · <strong>0924443839</strong></p>
        <p className="muted">طرابلس — ليبيا</p>
        <Link className="btn" to="/login">رجوع لتسجيل الدخول</Link>
      </div>
    </section>
  );
}
