import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, money, statusBadgeClass } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type Product = {
  id: string;
  nameAr: string;
  brand?: string;
  retailPrice?: string | number;
  basePrice: string | number;
  costPrice?: string | number;
  wholesalePrice?: string | number;
  status: string;
  variants: Array<{ id: string; sku: string; price: string | number; barcode?: string }>;
};

export function ProductsPage() {
  const { isOwner, hasPermission } = useAuth();
  const canSeeCost = isOwner || hasPermission('products.edit') || hasPermission('settings.manage');
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');

  async function load() {
    const data = await api<Product[]>('/products');
    setProducts(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.nameAr, p.brand, p.variants[0]?.sku]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [products, q]);

  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const colSpan = 4 + (isOwner ? 1 : 0) + (canSeeCost ? 1 : 0) + 2;

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          nameAr,
          retailPrice,
          wholesalePrice:
            isOwner && wholesalePrice !== '' ? Number(wholesalePrice) : undefined,
          costPrice: canSeeCost && costPrice !== '' ? Number(costPrice) : undefined,
          sku: sku || undefined,
          brand: brand || undefined,
        }),
      });
      setNameAr('');
      setRetailPrice(0);
      setWholesalePrice('');
      setCostPrice('');
      setSku('');
      setBrand('');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>إدارة المنتجات</h1>
          <p>
            {isOwner
              ? 'الكتالوج والمتغيرات — سعر الجملة ظاهر للمالك الرئيسي فقط'
              : 'الكتالوج والمتغيرات وأسعار البيع'}
          </p>
        </div>
        <button className="btn" type="button" onClick={() => setShowCreate((v) => !v)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          {showCreate ? 'إخفاء النموذج' : 'إضافة منتج'}
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">إجمالي المنتجات</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">نشط</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">المعروض بعد البحث</div>
          <div className="stat-value">{filtered.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">المتغيرات</div>
          <div className="stat-value">
            {products.reduce((n, p) => n + (p.variants?.length || 0), 0)}
          </div>
        </div>
      </div>

      {showCreate ? (
        <form className="panel form-grid two" onSubmit={onCreate}>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>معلومات المنتج الأساسية</strong>
          </div>
          <label>
            اسم المنتج
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
          </label>
          <label>
            سعر البيع (Retail) د.ل
            <input
              type="number"
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
              required
            />
          </label>
          {isOwner ? (
            <label>
              سعر الجملة
              <input
                type="number"
                value={wholesalePrice}
                onChange={(e) =>
                  setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
          ) : null}
          {canSeeCost ? (
            <label>
              سعر التكلفة
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          ) : null}
          <label>
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </label>
          <label>
            العلامة
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" type="submit">
              حفظ المنتج
            </button>
            <button className="btn secondary" type="button" onClick={() => setShowCreate(false)}>
              إلغاء
            </button>
          </div>
        </form>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      <div className="panel">
        <div className="toolbar">
          <strong>قائمة المنتجات</strong>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو SKU..."
            style={{ minWidth: 240, height: 36, padding: '0 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>البيع</th>
                {isOwner ? <th>الجملة</th> : null}
                {canSeeCost ? <th>التكلفة</th> : null}
                <th>المتغيرات</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.nameAr}</div>
                    <div style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>{p.brand}</div>
                  </td>
                  <td>{p.variants[0]?.sku || '—'}</td>
                  <td>{money(p.retailPrice ?? p.basePrice)}</td>
                  {isOwner ? (
                    <td>{p.wholesalePrice != null ? money(p.wholesalePrice) : '—'}</td>
                  ) : null}
                  {canSeeCost ? (
                    <td>{p.costPrice != null ? money(p.costPrice) : '—'}</td>
                  ) : null}
                  <td>{p.variants.length}</td>
                  <td>
                    <span className={statusBadgeClass(p.status)}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={colSpan} className="empty">
                    لا توجد منتجات
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
