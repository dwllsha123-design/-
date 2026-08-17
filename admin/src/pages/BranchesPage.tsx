import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type BranchType = 'WHOLESALE_RETAIL' | 'RETAIL';

type Branch = {
  id: string;
  name: string;
  username: string;
  type: BranchType;
  isMain: boolean;
  isActive: boolean;
  warehouseId: string;
  warehouse?: { id: string; code: string; nameAr: string };
  _count?: { orders: number };
};

type Transfer = {
  id: string;
  createdAt: string;
  notes?: string | null;
  fromBranch: { name: string };
  toBranch: { name: string };
  items: Array<{
    quantity: number;
    variant: { sku: string; product: { nameAr: string } };
  }>;
};

type ScanHit = {
  variantId: string;
  productName: string;
  variantName?: string | null;
  sku: string;
  available?: number | null;
};

const typeLabel: Record<BranchType, string> = {
  WHOLESALE_RETAIL: 'جملة وقطاعي',
  RETAIL: 'قطاعي فقط',
};

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toBranchId, setToBranchId] = useState('');
  const [scan, setScan] = useState('');
  const [lines, setLines] = useState<Array<ScanHit & { quantity: number }>>([]);
  const [notes, setNotes] = useState('');

  const main = branches.find((b) => b.isMain);
  const others = branches.filter((b) => !b.isMain);

  async function load() {
    try {
      const [list, hist] = await Promise.all([
        api<Branch[]>('/branches'),
        api<Transfer[]>('/branches/transfers'),
      ]);
      setBranches(list);
      setTransfers(hist);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الفروع');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          type: 'RETAIL',
        }),
      });
      setName('');
      setUsername('');
      setPassword('');
      setMessage('تم إنشاء الفرع. يمكنه الدخول باسم المستخدم وكلمة المرور.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الفرع');
    } finally {
      setBusy(false);
    }
  }

  async function addLine() {
    const code = scan.trim();
    if (!code) return;
    setError('');
    try {
      const found = await api<ScanHit>(`/barcodes/lookup/${encodeURIComponent(code)}`);
      let available = 0;
      if (main) {
        try {
          const av = await api<{ available: number }>(
            `/inventory/available?variantId=${found.variantId}&warehouseId=${main.warehouseId}`,
          );
          available = av.available;
        } catch {
          available = 0;
        }
      }
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === found.variantId);
        if (existing) {
          return prev.map((l) =>
            l.variantId === found.variantId
              ? { ...l, quantity: l.quantity + 1, available }
              : l,
          );
        }
        return [
          ...prev,
          {
            ...found,
            available,
            quantity: 1,
          },
        ];
      });
      setScan('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'الصنف غير موجود');
    }
  }

  async function sendTransfer(e: FormEvent) {
    e.preventDefault();
    if (!toBranchId || !lines.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/branches/transfers', {
        method: 'POST',
        body: JSON.stringify({
          toBranchId,
          notes: notes.trim() || undefined,
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      setLines([]);
      setNotes('');
      setMessage('تم تحويل البضاعة وخصمها من الفرع الرئيسي.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحويل');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>الفروع</h1>
          <p>
            كل فرع له حساب دخول ومخزون مستقل ونقطة بيع خاصة. التحويل يتم من الفرع الرئيسي إلى باقي
            الفروع.
          </p>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <div className="panel">
        <div className="toolbar">
          <strong>الفروع المسجّلة</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الفرع</th>
                <th>اسم الدخول</th>
                <th>نوع البيع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.name}
                    {b.isMain ? ' — الرئيسي' : ''}
                  </td>
                  <td dir="ltr">{b.username}</td>
                  <td>{typeLabel[b.type]}</td>
                  <td>{b.isActive ? 'نشط' : 'موقوف'}</td>
                </tr>
              ))}
              {!branches.length ? (
                <tr>
                  <td colSpan={4} className="empty">
                    لا توجد فروع بعد — شغّل تهيئة القاعدة لإنشاء الفرع الرئيسي
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <form className="panel stack" onSubmit={createBranch}>
        <strong>إضافة فرع قطاعي</strong>
        <p className="muted" style={{ margin: 0 }}>
          الحساب يعمل على شاشة الدخول نفسها. البيع في هذا الفرع يكون قطاعي فقط.
        </p>
        <div className="form-grid two">
          <label>
            اسم الفرع
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            اسم المستخدم
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="branch2"
              dir="ltr"
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'جارٍ الحفظ...' : 'إنشاء الفرع'}
        </button>
      </form>

      <form className="panel stack" onSubmit={sendTransfer}>
        <strong>تحويل من الفرع الرئيسي</strong>
        <p className="muted" style={{ margin: 0 }}>
          يُخصم من مخزون {main?.name || 'الرئيسي'} ويُضاف إلى الفرع المختار.
        </p>
        <div className="form-grid two">
          <label>
            إلى فرع
            <select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)} required>
              <option value="">اختر فرعاً</option>
              {others.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            باركود / SKU
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addLine();
                  }
                }}
                placeholder="امسح الصنف"
                dir="ltr"
              />
              <button className="btn secondary" type="button" onClick={() => void addLine()}>
                إضافة
              </button>
            </div>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>المتاح في الرئيسي</th>
                <th>الكمية المحوّلة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.variantId}>
                  <td>
                    {l.productName}
                    {l.variantName ? ` — ${l.variantName}` : ''} / {l.sku}
                  </td>
                  <td>{l.available ?? '—'}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.variantId === l.variantId
                              ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                              : x,
                          ),
                        )
                      }
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((x) => x.variantId !== l.variantId))}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {!lines.length ? (
                <tr>
                  <td colSpan={4} className="empty">
                    امسح أصنافاً من مخزون الفرع الرئيسي
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <label>
          ملاحظات
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={busy || !toBranchId || !lines.length}>
          تأكيد التحويل
        </button>
      </form>

      <div className="panel">
        <div className="toolbar">
          <strong>آخر التحويلات</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>من</th>
                <th>إلى</th>
                <th>الأصناف</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleString('ar-LY')}</td>
                  <td>{t.fromBranch.name}</td>
                  <td>{t.toBranch.name}</td>
                  <td>
                    {t.items
                      .map((i) => `${i.variant.product.nameAr} × ${i.quantity}`)
                      .join('، ')}
                  </td>
                </tr>
              ))}
              {!transfers.length ? (
                <tr>
                  <td colSpan={4} className="empty">
                    لا تحويلات بعد
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
