import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Reservation = {
  id: string;
  quantity: number;
  status: string;
  expiresAt?: string;
  variant: { sku: string; product: { nameAr: string } };
  page?: { name: string; publicCode: number } | null;
};

type Product = {
  nameAr: string;
  variants: Array<{ id: string; sku: string; available?: number }>;
};

export function ReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  async function load() {
    const [r, p] = await Promise.all([
      api<Reservation[]>('/reservations'),
      api<Product[]>('/products'),
    ]);
    setRows(r);
    setProducts(p);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/reservations', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحجز');
    }
  }

  async function cancel(id: string) {
    try {
      await api(`/reservations/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'cancelled_by_agent' }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإلغاء');
    }
  }

  const variants = products.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      label: `${p.nameAr} / ${v.sku} (متاح: ${v.available ?? '—'})`,
    })),
  );

  return (
    <div className="stack">
      <div className="page-title">
        <h1>حجوزات المخزون</h1>
        <p>المخزون مركزي — الحجز يقلل المتاح دون إنشاء مخزون منفصل</p>
      </div>

      <form className="panel form-grid two" onSubmit={create}>
        <label>
          المنتج
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)} required>
            <option value="">اختر</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          الكمية
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <div>
          <button className="btn" type="submit">
            حجز
          </button>
        </div>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>الصفحة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.variant.product.nameAr}
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{r.variant.sku}</div>
                </td>
                <td>{r.quantity}</td>
                <td>
                  {r.page ? `${r.page.name} (#${r.page.publicCode})` : '—'}
                </td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => cancel(r.id)}>
                    إلغاء الحجز
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
