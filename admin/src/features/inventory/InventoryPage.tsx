import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ReturnToStockPanel } from '@/features/returns/ReturnsPage';

type Stock = {
  id: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
  warehouse: { nameAr: string };
  variant: {
    sku: string;
    product: { nameAr: string };
    color?: string;
    size?: string;
  };
};

type Warehouse = { id: string; nameAr: string; code: string };
type Product = {
  variants: Array<{ id: string; sku: string; productName?: string; nameAr?: string }>;
  nameAr: string;
};

function stockStatus(available: number, reorderLevel: number) {
  if (available <= 0) return { label: 'نافد', className: 'badge danger' };
  if (available <= (reorderLevel || 5)) return { label: 'منخفض', className: 'badge warning' };
  return { label: 'متاح', className: 'badge success' };
}

export function InventoryPage() {
  const { hasPermission, isOwner } = useAuth();
  const [params, setParams] = useSearchParams();
  const canReturn = isOwner || hasPermission('inventory.adjust');
  const tab = params.get('tab') === 'returns' && canReturn ? 'returns' : 'stock';
  const [stock, setStock] = useState<Stock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variantId, setVariantId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState('IN');
  const [variants, setVariants] = useState<Array<{ id: string; label: string }>>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);

  async function load() {
    const [s, w, products] = await Promise.all([
      api<Stock[]>('/inventory/stock'),
      api<Warehouse[]>('/inventory/warehouses'),
      api<Product[]>('/products'),
    ]);
    setStock(s);
    setWarehouses(w);
    if (w[0]) setWarehouseId(w[0].id);
    setVariants(
      products.flatMap((p) =>
        p.variants.map((v) => ({
          id: v.id,
          label: `${p.nameAr} — ${v.sku}`,
        })),
      ),
    );
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const mapped = stock.map((s) => {
      const available = s.quantityOnHand - s.quantityReserved;
      return { ...s, available, status: stockStatus(available, s.reorderLevel) };
    });
    if (!term) return mapped;
    return mapped.filter((s) =>
      [s.variant.product.nameAr, s.variant.sku, s.warehouse.nameAr]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [stock, q]);

  const kpis = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let onHand = 0;
    let out = 0;
    for (const s of stock) {
      const a = s.quantityOnHand - s.quantityReserved;
      available += Math.max(0, a);
      reserved += s.quantityReserved;
      onHand += s.quantityOnHand;
      if (a <= 0) out += 1;
    }
    return { skus: stock.length, available, reserved, onHand, out };
  }, [stock]);

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId,
          variantId,
          type,
          quantity: type === 'ADJUST' ? quantity : Math.abs(quantity),
        }),
      });
      setShowAdjust(false);
      setQuantity(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التعديل');
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>إدارة المخزون</h1>
          <p>
            {tab === 'returns'
              ? 'إرجاع القطع إلى المخزون بعد مسح باركود الطلب.'
              : 'من هنا تدخلين كمية كل منتج بعد إضافته في صفحة المنتجات، وتشوفين المتوفر والقريب من النفاد. بدون كمية هنا لن يظهر المنتج متاحاً للبيع.'}
          </p>
        </div>
        {tab === 'stock' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn secondary" type="button" onClick={() => setShowAdjust((v) => !v)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                tune
              </span>
              تسوية مخزون
            </button>
            <button className="btn" type="button" onClick={() => setShowAdjust(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add
              </span>
              إدخال/إخراج
            </button>
          </div>
        ) : null}
      </div>

      {canReturn ? (
        <div className="page-tabs" role="tablist" aria-label="أقسام المخزون">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'stock'}
            className={tab === 'stock' ? 'active' : ''}
            onClick={() => setParams({})}
          >
            المخزون
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'returns'}
            className={tab === 'returns' ? 'active' : ''}
            onClick={() => setParams({ tab: 'returns' })}
          >
            إرجاع للمخزون
          </button>
        </div>
      ) : null}

      {tab === 'returns' ? <ReturnToStockPanel /> : null}

      {tab === 'stock' ? (
        <>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">أصناف المخزون</div>
          <div className="stat-value">{kpis.skus}</div>
        </div>
        <div className="stat">
          <div className="stat-label">المتاح للبيع</div>
          <div className="stat-value">{kpis.available}</div>
        </div>
        <div className="stat">
          <div className="stat-label">محجوز</div>
          <div className="stat-value">{kpis.reserved}</div>
        </div>
        <div className={`stat${kpis.out > 0 ? ' alert' : ''}`}>
          <div className="stat-label">نافد</div>
          <div className="stat-value">{kpis.out}</div>
        </div>
      </div>

      {showAdjust ? (
        <form className="panel form-grid two" onSubmit={onAdjust}>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>تسوية / حركة مخزون</strong>
          </div>
          <label>
            المخزن
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label>
            الصنف
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
            النوع
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="IN">إدخال (شراء/توريد)</option>
              <option value="OUT">إخراج</option>
              <option value="ADJUST">تعديل رصيد</option>
              <option value="RETURN">مرتجع</option>
            </select>
          </label>
          <label>
            الكمية
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" type="submit">
              حفظ الحركة
            </button>
            <button className="btn secondary" type="button" onClick={() => setShowAdjust(false)}>
              إلغاء
            </button>
          </div>
        </form>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      <div className="panel">
        <div className="toolbar">
          <strong>قائمة المخزون</strong>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="تصفية بالمستودع أو المنتج..."
            style={{ minWidth: 260, height: 36, padding: '0 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>المخزن</th>
                <th>المتاح</th>
                <th>محجوز</th>
                <th>على الرف</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.variant.product.nameAr}</div>
                    <div style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>
                      {[s.variant.color, s.variant.size].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>{s.variant.sku}</td>
                  <td>{s.warehouse.nameAr}</td>
                  <td style={{ color: s.available <= 0 ? 'var(--danger-text)' : undefined, fontWeight: 600 }}>
                    {s.available}
                  </td>
                  <td>{s.quantityReserved}</td>
                  <td>{s.quantityOnHand}</td>
                  <td>
                    <span className={s.status.className}>{s.status.label}</span>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    لا توجد بيانات مخزون
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}
