import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { API_BASE } from '@/api/client';
import { detectLoginKind, homePath, useAuth } from './AuthContext';

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [apiWarning, setApiWarning] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/health`, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const text = await res.text();
        if (cancelled) return;
        const ok = res.ok && text.trim().startsWith('{');
        if (!ok) {
          setApiWarning(
            'تنبيه: الخادم (API) غير متصل حالياً. لن ينجح تسجيل الدخول حتى يُشغَّل NestJS على السيرفر ويُوجَّه /api/v1 إليه.',
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiWarning(
            'تنبيه: تعذر الوصول إلى API. تحققي من تشغيل الباكند على https://daralonotha.com/api/v1',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kind = useMemo(() => detectLoginKind(identifier), [identifier]);
  const field = {
    phone: {
      label: 'رقم الهاتف',
      placeholder: '09xxxxxxxx',
      hint: 'سيُفتح لك بوابة المندوب أو نقطة بيع الفرع أو لوحة الإدارة حسب حسابك',
      autoComplete: 'tel',
      inputMode: 'tel' as const,
    },
    email: {
      label: 'البريد الإلكتروني',
      placeholder: 'name@example.com',
      hint: 'سيُفتح لك القسم المسجّل لحسابك تلقائياً — إدارة أو فرع أو مندوب',
      autoComplete: 'username',
      inputMode: 'email' as const,
    },
    username: {
      label: 'رقم الهاتف أو اسم المستخدم',
      placeholder: 'main أو admin أو 09xxxxxxxx',
      hint: 'شاشة واحدة — نتعرّف على الحساب وندخلك للإدارة أو الفرع أو المندوب',
      autoComplete: 'username',
      inputMode: 'text' as const,
    },
  }[kind];

  if (!loading && user) {
    return <Navigate to={homePath(user)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="do-auth-wrapper">
      <div className="do-auth-brand">
        <div className="do-auth-brand-content">
          <img src="/brand-logo.png" alt="دار الأنوثة" />
          <div className="do-auth-brand-rule" />
          <div className="do-auth-brand-tagline">
            شاشة دخول واحدة
            <br />
            شركة دار الأنوثة
          </div>
        </div>
      </div>

      <div className="do-auth-form-side">
        <form className="do-auth-card" onSubmit={onSubmit}>
          <div className="do-auth-logo">
            <img src="/brand-logo.png" alt="دار الأنوثة" />
          </div>
          <div className="do-auth-heading">
            <h1>مرحبًا بعودتك</h1>
            <p>أدخل الرقم أو اسم المستخدم — سنوجهك للإدارة أو الفرع أو بوابة المندوب حسب حسابك</p>
          </div>

          {apiWarning ? <div className="error">{apiWarning}</div> : null}
          {error ? <div className="error">{error}</div> : null}

          <div className="do-field">
            <label htmlFor="inputUsername">{field.label}</label>
            <input
              id="inputUsername"
              className="do-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              inputMode={field.inputMode}
              dir="ltr"
              required
            />
            <p className="do-field-hint">{field.hint}</p>
          </div>
          <div className="do-field">
            <label htmlFor="inputChoosePassword">كلمة السر</label>
            <div className="do-input-group">
              <input
                id="inputChoosePassword"
                className="do-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="do-toggle-btn"
                aria-label="عرض/إخفاء كلمة السر"
                onClick={() => setShowPassword((v) => !v)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>
          <button className="do-submit-btn" type="submit" disabled={busy}>
            {busy ? 'جارٍ الدخول...' : 'تسجيل دخول'}
          </button>

          <div className="do-auth-footer">شركة دار الأنوثة © 2026</div>
        </form>
      </div>
    </div>
  );
}
