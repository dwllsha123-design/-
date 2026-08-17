import { FormEvent, Fragment, useEffect, useMemo, useState } from 'react';
import { api, apiUpload, money, statusBadgeClass } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type Category = { id: string; nameAr: string; slug: string };
type ProductImage = { id: string; url: string; isPrimary: boolean };
type Variant = {
  id: string;
  sku: string;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  retailPrice: number;
  price?: number;
};
type Product = {
  id: string;
  nameAr: string;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  retailPrice?: string | number;
  basePrice: string | number;
  costPrice?: string | number;
  wholesalePrice?: string | number;
  status: string;
  category?: Category | null;
  images?: ProductImage[];
  variants: Variant[];
};
type VariantDraft = { size: string; color: string; sku: string; retailPrice: string };

const emptyVariant = (): VariantDraft => ({ size: '', color: '', sku: '', retailPrice: '' });

function printBarcodes(
  labels: Array<{ barcode: string; productName: string; sku: string; size?: string | null; color?: string | null }>,
) {
  const w = window.open('', '_blank', 'width=420,height=640');
  if (!w) return;
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>باركود</title>
  <style>
    body{font-family:Tahoma,sans-serif;padding:16px}
    .label{border:1px dashed #999;padding:12px;margin:0 0 12px;page-break-inside:avoid;text-align:center}
    .name{font-weight:700;margin-bottom:4px}
    .meta{color:#555;font-size:12px;margin-bottom:8px}
    svg{max-width:100%}
  </style></head><body>
  ${labels
    .map(
      (l, i) =>
        `<div class="label"><div class="name">${l.productName}</div>
         <div class="meta">${[l.color, l.size, l.sku].filter(Boolean).join(' · ')}</div>
         <svg id="b${i}"></svg><div style="letter-spacing:2px;margin-top:4px">${l.barcode}</div></div>`,
    )
    .join('')}
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    const labels = ${JSON.stringify(labels.map((l) => l.barcode))};
    labels.forEach((code, i) => { try { JsBarcode('#b'+i, code, {format:'CODE128', width:1.6, height:48, displayValue:false}); } catch(e) {} });
    setTimeout(() => window.print(), 400);
  </script></body></html>`);
  w.document.close();
}

export function ProductsPage() {
  const { isOwner, hasPermission } = useAuth();
  const canSeeCost = isOwner || hasPermission('products.edit') || hasPermission('settings.manage');
  const canCreate = hasPermission('products.create') || isOwner;
  const canEdit = hasPermission('products.edit') || isOwner;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [retailPrice, setRetailPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [newVar, setNewVar] = useState<VariantDraft>(emptyVariant());
  const [imageUrl, setImageUrl] = useState('');

  async function load() {
    const [data, cats] = await Promise.all([
      api<Product[]>('/products'),
      api<Category[]>('/store/categories').catch(() => [] as Category[]),
    ]);
    setProducts(data);
    setCategories(cats);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      [p.nameAr, p.brand, p.sku, ...p.variants.map((v) => v.sku), ...p.variants.map((v) => v.barcode)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [products, q]);

  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const colSpan = 5 + (isOwner ? 1 : 0) + (canSeeCost ? 1 : 0);

  function resetForm() {
    setNameAr('');
    setDescription('');
    setRetailPrice(0);
    setWholesalePrice('');
    setCostPrice('');
    setSku('');
    setBrand('');
    setCategoryId('');
    setImageUrls('');
    setPendingFiles([]);
    setVariants([emptyVariant()]);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const variantPayload = variants
        .filter((v) => v.size || v.color || v.sku || v.retailPrice)
        .map((v) => ({
          size: v.size || undefined,
          color: v.color || undefined,
          sku: v.sku || undefined,
          retailPrice: Number(v.retailPrice || retailPrice || 0),
        }));
      const created = await api<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          nameAr,
          description: description || undefined,
          categoryId: categoryId || undefined,
          retailPrice,
          wholesalePrice: isOwner && wholesalePrice !== '' ? Number(wholesalePrice) : undefined,
          costPrice: canSeeCost && costPrice !== '' ? Number(costPrice) : undefined,
          sku: sku || undefined,
          brand: brand || undefined,
          imageUrls: imageUrls
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          variants: variantPayload.length ? variantPayload : undefined,
        }),
      });
      for (const file of pendingFiles) {
        await apiUpload(`/products/${created.id}/images/upload`, file);
      }
      resetForm();
      setShowCreate(false);
      await load();
      setOpenId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function generateBarcode(variantId: string) {
    setError('');
    try {
      await api(`/barcodes/variants/${variantId}/generate`, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إصدار الباركود');
    }
  }

  async function generateMissing() {
    setError('');
    try {
      const res = await api<{ count: number }>('/barcodes/variants/generate-missing', {
        method: 'POST',
        body: '{}',
      });
      await load();
      alert(`تم إصدار ${res.count} باركود`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإصدار');
    }
  }

  async function addSize(productId: string) {
    if (!newVar.size && !newVar.color) {
      setError('أدخلي المقاس أو اللون');
      return;
    }
    setError('');
    const product = products.find((p) => p.id === productId);
    await api(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify({
        size: newVar.size || undefined,
        color: newVar.color || undefined,
        sku: newVar.sku || undefined,
        retailPrice: Number(newVar.retailPrice || product?.retailPrice || 0),
      }),
    });
    setNewVar(emptyVariant());
    await load();
  }

  async function uploadToProduct(productId: string, file: File) {
    await apiUpload(`/products/${productId}/images/upload`, file);
    await load();
  }

  async function addImageLink(productId: string) {
    if (!imageUrl.trim()) return;
    await api(`/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify({ url: imageUrl.trim() }),
    });
    setImageUrl('');
    await load();
  }

  async function removeImage(productId: string, imageId: string) {
    await api(`/products/${productId}/images/${imageId}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>إدارة المنتجات</h1>
          <p>من هنا تضيفين منتجاتك: الاسم، الصور، السعر، المقاسات. يُولَّد كود DA-xxxx وباركود تلقائياً لكل مقاس مع إمكانية الطباعة.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canEdit ? (
            <button className="btn secondary" type="button" onClick={() => void generateMissing()}>
              إصدار باركود للناقص
            </button>
          ) : null}
          {canCreate ? (
            <button className="btn" type="button" onClick={() => setShowCreate((v) => !v)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add
              </span>
              {showCreate ? 'إخفاء النموذج' : 'إضافة منتج'}
            </button>
          ) : null}
        </div>
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
          <div className="stat-label">المقاسات / المتغيرات</div>
          <div className="stat-value">{products.reduce((n, p) => n + (p.variants?.length || 0), 0)}</div>
        </div>
      </div>

      {showCreate ? (
        <form className="panel form-grid two" onSubmit={onCreate}>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>منتج جديد</strong>
          </div>
          <label>
            اسم المنتج
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
          </label>
          <label>
            التصنيف
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">بدون تصنيف</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            الوصف
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>
          <label>
            سعر البيع د.ل
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
                onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
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
            SKU (اختياري — يُولَّد DA-xxxx تلقائياً)
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="اتركيه فارغاً للتوليد التلقائي"
            />
          </label>
          <label>
            العلامة
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            صور المنتج — ارفعي من جهازك (الأفضل 900×1200 بنسبة 3:4 كما في الرئيسية)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
            />
            {pendingFiles.length ? (
              <span style={{ fontSize: 12 }}>{pendingFiles.length} صورة جاهزة للرفع بعد الحفظ</span>
            ) : null}
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            أو روابط صور (كل رابط في سطر)
            <textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              placeholder="https://..."
            />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>المقاسات / الألوان</strong>
            <p style={{ margin: '6px 0 10px', fontSize: 13 }}>
              أضيفي كل مقاس في صف. يُصدر باركود تلقائياً لكل صف عند الحفظ.
            </p>
            {variants.map((v, idx) => (
              <div key={idx} className="form-grid two" style={{ marginBottom: 8 }}>
                <input
                  placeholder="المقاس (S / M / L / XL)"
                  value={v.size}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, size: e.target.value } : x)))
                  }
                />
                <input
                  placeholder="اللون"
                  value={v.color}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, color: e.target.value } : x)))
                  }
                />
                <input
                  placeholder="تلقائي DA-xxxx"
                  value={v.sku}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)))
                  }
                />
                <input
                  type="number"
                  placeholder={`سعر هذا المقاس (أو ${retailPrice})`}
                  value={v.retailPrice}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, retailPrice: e.target.value } : x)),
                    )
                  }
                />
              </div>
            ))}
            <button
              className="btn ghost"
              type="button"
              onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
            >
              + مقاس آخر
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" type="submit">
              حفظ المنتج وإصدار الباركود
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
            placeholder="بحث بالاسم أو SKU أو الباركود..."
            style={{ minWidth: 240, height: 36, padding: '0 12px' }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>التصنيف</th>
                <th>البيع</th>
                {isOwner ? <th>الجملة</th> : null}
                {canSeeCost ? <th>التكلفة</th> : null}
                <th>المقاسات</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <Fragment key={p.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images[0].url}
                            alt=""
                            width={40}
                            height={50}
                            style={{ objectFit: 'cover', borderRadius: 6 }}
                          />
                        ) : null}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.nameAr}</div>
                          <div style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.category?.nameAr || '—'}</td>
                    <td>{money(p.retailPrice ?? p.basePrice)}</td>
                    {isOwner ? <td>{p.wholesalePrice != null ? money(p.wholesalePrice) : '—'}</td> : null}
                    {canSeeCost ? <td>{p.costPrice != null ? money(p.costPrice) : '—'}</td> : null}
                    <td>{p.variants.length}</td>
                    <td>
                      <span className={statusBadgeClass(p.status)}>{p.status}</span>
                    </td>
                  </tr>
                  {openId === p.id ? (
                    <tr key={`${p.id}-d`}>
                      <td colSpan={colSpan}>
                        <div style={{ display: 'grid', gap: 14 }}>
                          <div>
                            <strong>الصور</strong>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              {(p.images || []).map((img) => (
                                <div key={img.id} style={{ position: 'relative' }}>
                                  <img
                                    src={img.url}
                                    alt=""
                                    width={72}
                                    height={90}
                                    style={{ objectFit: 'cover', borderRadius: 8 }}
                                  />
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      className="btn ghost"
                                      style={{ display: 'block', marginTop: 4, padding: '2px 8px' }}
                                      onClick={() => void removeImage(p.id, img.id)}
                                    >
                                      حذف
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            {canEdit ? (
                              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void uploadToProduct(p.id, f);
                                  }}
                                />
                                <input
                                  placeholder="رابط صورة"
                                  value={imageUrl}
                                  onChange={(e) => setImageUrl(e.target.value)}
                                />
                                <button className="btn secondary" type="button" onClick={() => void addImageLink(p.id)}>
                                  إضافة رابط
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div>
                            <strong>المقاسات والباركود</strong>
                            <table>
                              <thead>
                                <tr>
                                  <th>المقاس</th>
                                  <th>اللون</th>
                                  <th>SKU</th>
                                  <th>السعر</th>
                                  <th>الباركود</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.variants.map((v) => (
                                  <tr key={v.id}>
                                    <td>{v.size || '—'}</td>
                                    <td>{v.color || '—'}</td>
                                    <td>{v.sku}</td>
                                    <td>{money(v.retailPrice ?? v.price ?? 0)}</td>
                                    <td>
                                      <code>{v.barcode || '—'}</code>
                                    </td>
                                    <td>
                                      {canEdit && !v.barcode ? (
                                        <button
                                          className="btn ghost"
                                          type="button"
                                          onClick={() => void generateBarcode(v.id)}
                                        >
                                          إصدار باركود
                                        </button>
                                      ) : v.barcode ? (
                                        <button
                                          className="btn ghost"
                                          type="button"
                                          onClick={() =>
                                            printBarcodes([
                                              {
                                                barcode: v.barcode as string,
                                                productName: p.nameAr,
                                                sku: v.sku,
                                                size: v.size,
                                                color: v.color,
                                              },
                                            ])
                                          }
                                        >
                                          طباعة
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {canEdit ? (
                              <div className="form-grid two" style={{ marginTop: 10 }}>
                                <input
                                  placeholder="مقاس جديد"
                                  value={newVar.size}
                                  onChange={(e) => setNewVar((x) => ({ ...x, size: e.target.value }))}
                                />
                                <input
                                  placeholder="لون"
                                  value={newVar.color}
                                  onChange={(e) => setNewVar((x) => ({ ...x, color: e.target.value }))}
                                />
                                <input
                                  placeholder="سعر هذا المقاس"
                                  type="number"
                                  value={newVar.retailPrice}
                                  onChange={(e) => setNewVar((x) => ({ ...x, retailPrice: e.target.value }))}
                                />
                                <button className="btn secondary" type="button" onClick={() => void addSize(p.id)}>
                                  إضافة مقاس + باركود
                                </button>
                              </div>
                            ) : null}
                            {p.variants.some((v) => v.barcode) ? (
                              <button
                                className="btn"
                                type="button"
                                style={{ marginTop: 8 }}
                                onClick={() =>
                                  printBarcodes(
                                    p.variants
                                      .filter((v) => v.barcode)
                                      .map((v) => ({
                                        barcode: v.barcode as string,
                                        productName: p.nameAr,
                                        sku: v.sku,
                                        size: v.size,
                                        color: v.color,
                                      })),
                                  )
                                }
                              >
                                طباعة كل الباركود
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={colSpan} className="empty">
                    لا توجد منتجات — اضغطي «إضافة منتج»
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
