import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '@/api/client';

export function RegisterMarketerPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/users/register-marketer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          password,
          city: 'طرابلس',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'فشل التسجيل');
      }
      setMsg(json?.data?.message || json?.message || 'تم إرسال طلبك بانتظار موافقة الإدارة');
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التسجيل');
    }
  }

  return (
    <div className="login-page">
      <form className="login-card stack" onSubmit={onSubmit}>
        <div className="page-title">
          <h1>تسجيل مسوق — طرابلس</h1>
          <p>من هنا يسجّل المسوّق الجديد بياناته. بعد الإرسال يبقى الحساب معلّقاً حتى توافق الإدارة من الإشعارات في لوحة التحكم.</p>
        </div>
        <label>
          الاسم الكامل
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          الهاتف
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          البريد (اختياري)
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {msg ? <div className="success">{msg}</div> : null}
        {error ? <div className="error">{error}</div> : null}
        <button className="btn" type="submit">
          إرسال طلب التسجيل
        </button>
        <Link to="/login">العودة لتسجيل الدخول</Link>
      </form>
    </div>
  );
}
