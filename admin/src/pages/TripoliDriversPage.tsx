import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Driver = {
  id: string;
  name: string;
  phone?: string | null;
  isActive: boolean;
  lastLat?: number | null;
  lastLng?: number | null;
  lastSeenAt?: string | null;
  online: boolean;
  currentCount: number;
  currentOrders: Array<{
    id: string;
    orderNumber: string;
    shippingName?: string | null;
    shippingPhone?: string | null;
    area?: string | null;
    localStatus?: string | null;
    status: string;
  }>;
};

type Dash = {
  city: string;
  stats: {
    drivers: number;
    pendingUnassigned: number;
    outForDelivery: number;
    deliveredToday: number;
  };
  drivers: Driver[];
};

export function TripoliDriversPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function load() {
    const d = await api<Dash>('/couriers/dashboard');
    setData(d);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const t = window.setInterval(() => load().catch(() => undefined), 20000);
    return () => window.clearInterval(t);
  }, []);

  async function addDriver(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/couriers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, password }),
      });
      setName('');
      setPhone('');
      setPassword('');
      setMsg('تم تسجيل المندوب — يمكنه الدخول برقم الهاتف وكلمة السر');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>إدارة مناديب طرابلس</h1>
        <p>
          هذا القسم للمناديب المستقلين داخل طرابلس فقط. طلبات باقي المدن تُمرَّر مباشرة عبر API شركة التوصيل دون تدخل يدوي.
        </p>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {msg ? <div className="badge success">{msg}</div> : null}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">مناديب نشطون</div>
          <div className="stat-value">{data?.stats.drivers ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">بانتظار تعيين</div>
          <div className="stat-value">{data?.stats.pendingUnassigned ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">قيد التوصيل</div>
          <div className="stat-value">{data?.stats.outForDelivery ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">تسليم اليوم</div>
          <div className="stat-value">{data?.stats.deliveredToday ?? '—'}</div>
        </div>
      </div>

      <DriversMap drivers={data?.drivers || []} />

      <form className="panel form-grid two" onSubmit={addDriver}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>تسجيل مندوب مستقل (دخول برقم الهاتف)</strong>
        </div>
        <label>
          الاسم
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          الهاتف
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          كلمة السر
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <div>
          <button className="btn" type="submit">
            حفظ المندوب
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="toolbar">
          <strong>جدول المناديب — طرابلس</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المندوب</th>
                <th>الحالة</th>
                <th>اتصال</th>
                <th>الموقع</th>
                <th>الطلبات الحالية</th>
              </tr>
            </thead>
            <tbody>
              {(data?.drivers || []).map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{d.name}</div>
                    <div className="muted">{d.phone || '—'}</div>
                  </td>
                  <td>
                    <span className={d.online ? 'badge success' : d.isActive ? 'badge' : 'badge danger'}>
                      {d.online ? 'متصل' : d.isActive ? 'غير متصل' : 'موقوف'}
                    </span>
                  </td>
                  <td>
                    {d.phone ? (
                      <a className="icon-btn" href={`tel:${d.phone}`} title="اتصال" aria-label="اتصال">
                        <span className="material-symbols-outlined">call</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {d.lastLat && d.lastLng ? (
                      <a
                        href={`https://www.google.com/maps?q=${d.lastLat},${d.lastLng}`}
                        target="_blank"
                        rel="noreferrer"
                        title="موقع"
                      >
                        <span className="material-symbols-outlined">location_on</span>
                      </a>
                    ) : (
                      <span className="muted">لا موقع بعد</span>
                    )}
                  </td>
                  <td>
                    {d.currentOrders.length ? (
                      d.currentOrders.map((o) => (
                        <div key={o.id} style={{ fontSize: 13 }}>
                          📦 {o.orderNumber} — {o.shippingName} ({o.localStatus || o.status})
                        </div>
                      ))
                    ) : (
                      <span className="muted">لا طلبات حالية</span>
                    )}
                  </td>
                </tr>
              ))}
              {!data?.drivers.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    لا يوجد مناديب بعد
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DriversMap({ drivers }: { drivers: Driver[] }) {
  const pins = drivers.filter((d) => d.lastLat != null && d.lastLng != null);
  return (
    <div className="panel">
      <strong>خريطة مناديب طرابلس</strong>
      <p className="muted">تحديث الموقع يصل من تطبيق المندوب أثناء العمل.</p>
      {pins.length ? (
        <iframe
          title="خريطة المناديب"
          className="drivers-map"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=13.05,32.78,13.35,32.95&layer=mapnik${pins
            .map((d) => `&marker=${d.lastLat}%2C${d.lastLng}`)
            .join('')}`}
        />
      ) : (
        <iframe
          title="خريطة طرابلس"
          className="drivers-map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=13.05,32.78,13.35,32.95&layer=mapnik"
        />
      )}
    </div>
  );
}
