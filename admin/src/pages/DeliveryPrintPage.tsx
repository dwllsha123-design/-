import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../api/client';

type Slip = {
  id: string;
  shippingSlipNo?: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  fee: string | number;
  type: string;
  status: string;
  sourcePage?: string | number | null;
  agent?: { name: string; phone?: string } | null;
  company?: { nameAr: string } | null;
  order: {
    orderNumber: string;
    shippingName?: string;
    shippingPhone?: string;
    city?: string;
    area?: string;
    address?: string;
    notes?: string;
    totalAmount: string | number;
    items: Array<{
      productName: string;
      variantName?: string;
      quantity: number;
      lineTotal: string | number;
    }>;
    facebookPage?: { name: string; publicCode: number } | null;
  };
};

export function DeliveryPrintPage() {
  const [params] = useSearchParams();
  const ids = useMemo(
    () => (params.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean),
    [params],
  );
  const [slips, setSlips] = useState<Slip[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ids.length) {
      setError('لا توجد بوليصات للطباعة');
      return;
    }
    api<{ slips: Slip[] }>('/delivery/slips/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
      .then((d) => {
        setSlips(d.slips || []);
        setTimeout(() => window.print(), 400);
      })
      .catch((e) => setError(e.message));
  }, [ids.join(',')]);

  if (error) return <div className="login-page">{error}</div>;
  if (!slips.length) return <div className="login-page">جارٍ تحميل البوليصات...</div>;

  return (
    <div className="print-root" dir="rtl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .slip { page-break-after: always; }
        }
        .print-root { padding: 24px; font-family: "IBM Plex Sans Arabic", Tahoma, sans-serif; color: #1a1a1a; }
        .slip { border: 1px solid #ccc; padding: 20px; margin-bottom: 24px; }
        .slip h1 { margin: 0 0 8px; font-size: 22px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 16px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 13px; }
        th { background: #f5f5f5; }
      `}</style>
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => window.print()}>
          طباعة
        </button>
        <button type="button" onClick={() => window.close()}>
          إغلاق
        </button>
      </div>
      {slips.map((s) => (
        <section className="slip" key={s.id}>
          <h1>بوليصة شحن — دار الأنوثة</h1>
          <div>رقم البوليصة: {s.shippingSlipNo || '—'}</div>
          <div>رقم الطلب: {s.order.orderNumber}</div>
          <div className="meta">
            <div>المستلم: {s.order.shippingName || '—'}</div>
            <div>الهاتف: {s.order.shippingPhone || '—'}</div>
            <div>
              العنوان: {[s.order.address, s.order.area, s.order.city].filter(Boolean).join(' — ') || '—'}
            </div>
            <div>
              مصدر الصفحة:{' '}
              {s.order.facebookPage?.name ||
                s.sourcePage ||
                s.order.facebookPage?.publicCode ||
                '—'}
            </div>
            <div>رقم Accuratess: {s.trackingNumber || '—'}</div>
            <div>التحصيل: {money(s.order.totalAmount)}</div>
            <div>رسوم التوصيل: {money(s.fee)}</div>
            <div>
              المندوب/الشركة: {s.agent?.name || s.company?.nameAr || (s.type === 'EXTERNAL' ? 'Accuratess' : '—')}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {s.order.items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    {it.productName}
                    {it.variantName ? ` — ${it.variantName}` : ''}
                  </td>
                  <td>{it.quantity}</td>
                  <td>{money(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {s.order.notes ? <p style={{ marginTop: 12 }}>ملاحظات: {s.order.notes}</p> : null}
        </section>
      ))}
    </div>
  );
}
