import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, statusBadgeClass, statusLabel } from '../api/client';

type Delivery = {
  id: string;
  status: string;
  type: string;
  shippingSlipNo?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  lastSyncedAt?: string | null;
  fee: string | number;
  notes?: string;
  order: {
    id: string;
    orderNumber: string;
    shippingName?: string;
    shippingPhone?: string;
    city?: string;
    area?: string;
    totalAmount: string | number;
    deliveryType?: string;
    deliveryFee?: string | number;
  };
  agent?: { name: string; phone?: string } | null;
  company?: { nameAr: string } | null;
};

type PendingOrder = {
  id: string;
  orderNumber: string;
  shippingName?: string;
  shippingPhone?: string;
  city?: string;
  area?: string;
  deliveryType: string;
  deliveryFee: string | number;
  totalAmount: string | number;
  status: string;
};

type Agent = { id: string; name: string; phone?: string };

export function DeliveryPage() {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orderId, setOrderId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [fee, setFee] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const selected = useMemo(
    () => pending.find((o) => o.id === orderId) || null,
    [pending, orderId],
  );

  async function load() {
    const [d, p, a] = await Promise.all([
      api<Delivery[]>('/delivery'),
      api<PendingOrder[]>('/delivery/pending-orders'),
      api<Agent[]>('/delivery/agents'),
    ]);
    setRows(d);
    setPending(p);
    setAgents(a);
    if (!orderId && p[0]) setOrderId(p[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) {
      setFee(null);
      return;
    }
    setFee(Number(selected.deliveryFee || 0));
    const qs = new URLSearchParams();
    if (selected.city) qs.set('city', selected.city);
    if (selected.area) qs.set('area', selected.area);
    api<{ deliveryFee: number }>(`/delivery/quote?${qs}`)
      .then((q) => setFee(q.deliveryFee))
      .catch(() => undefined);
  }, [selected?.id]);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function assign(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setMsg('');
    try {
      const isInternal = selected.deliveryType === 'INTERNAL';
      await api('/delivery/assign', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          type: selected.deliveryType,
          agentId: isInternal ? agentId : undefined,
          fee: fee ?? Number(selected.deliveryFee || 0),
        }),
      });
      setMsg(isInternal ? 'تم تعيين المندوب بنجاح' : 'تم إرسال الطلب لـ Accuratess');
      setAgentId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التعيين');
    }
  }

  async function syncOne(id: string) {
    setError('');
    setMsg('');
    try {
      await api(`/delivery/${id}/sync-accuratess`, { method: 'POST', body: '{}' });
      setMsg('تم تحديث حالة الشحنة من Accuratess');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المزامنة');
    }
  }

  async function syncAll() {
    setError('');
    setMsg('');
    try {
      const res = await api<{ count: number }>('/delivery/sync-accuratess', {
        method: 'POST',
        body: '{}',
      });
      setMsg(`تمت مزامنة ${res.count} شحنة`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل المزامنة');
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>التوصيل</h1>
          <p>طباعة بوليصات Accuratess وتتبع الحالة من اللوحة</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn secondary" type="button" onClick={() => syncAll()}>
            تحديث من Accuratess
          </button>
          <Link
            className="btn"
            to={`/delivery/print?ids=${(selectedIds.length ? selectedIds : rows.map((r) => r.id)).join(',')}`}
            target="_blank"
          >
            طباعة {selectedIds.length ? `المحددة (${selectedIds.length})` : 'الكل'}
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">بانتظار التعيين</div>
          <div className="stat-value">{pending.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">المندوبون</div>
          <div className="stat-value">{agents.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">سجلات التوصيل</div>
          <div className="stat-value">{rows.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">خارجي معلّق</div>
          <div className="stat-value">
            {rows.filter((r) => r.type === 'EXTERNAL' && r.status === 'PENDING').length}
          </div>
        </div>
      </div>

      <form className="panel form-grid two" onSubmit={assign}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>تعيين توصيل</strong>
        </div>
        <label>
          الطلب
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
            <option value="">اختر طلب</option>
            {pending.map((o) => (
              <option key={o.id} value={o.id}>
                {o.orderNumber} — {o.city || '—'} ({o.deliveryType === 'INTERNAL' ? 'داخلي' : 'خارجي'})
              </option>
            ))}
          </select>
        </label>
        {selected?.deliveryType === 'INTERNAL' ? (
          <label>
            المندوب
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
              <option value="">اختر مندوب</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.phone ? ` — ${a.phone}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            شركة التوصيل
            <input value="Accuratess — يُرسل مع مرجع الصفحة" disabled />
          </label>
        )}
        <label>
          رسوم التوصيل
          <input type="number" value={fee ?? ''} onChange={(e) => setFee(Number(e.target.value))} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn" type="submit" disabled={!orderId}>
            {selected?.deliveryType === 'INTERNAL' ? 'تعيين مندوب' : 'إرسال لشركة التوصيل'}
          </button>
        </div>
        {msg ? <div className="success" style={{ gridColumn: '1 / -1' }}>{msg}</div> : null}
        {error ? <div className="error" style={{ gridColumn: '1 / -1' }}>{error}</div> : null}
      </form>

      <div className="panel table-wrap">
        <div className="toolbar">
          <strong>سجلات التوصيل</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>البوليصة</th>
              <th>الطلب</th>
              <th>النوع</th>
              <th>العميل</th>
              <th>تتبع Accuratess</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(d.id)}
                    onChange={() => toggle(d.id)}
                  />
                </td>
                <td>{d.shippingSlipNo || '—'}</td>
                <td>{d.order.orderNumber}</td>
                <td>{d.type === 'INTERNAL' ? 'داخلي' : 'خارجي'}</td>
                <td>
                  {d.order.shippingName}
                  <div style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>
                    {d.order.shippingPhone}
                  </div>
                </td>
                <td>
                  {d.trackingNumber || '—'}
                  {d.trackingUrl ? (
                    <div>
                      <a href={d.trackingUrl} target="_blank" rel="noreferrer">
                        رابط التتبع
                      </a>
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={statusBadgeClass(d.status)}>
                    {statusLabel[d.status] || d.status}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Link className="btn secondary" to={`/delivery/print?ids=${d.id}`} target="_blank">
                    طباعة
                  </Link>
                  {d.type === 'EXTERNAL' ? (
                    <button className="btn ghost" type="button" onClick={() => syncOne(d.id)}>
                      تحديث
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="empty">
                  لا توجد سجلات توصيل
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
