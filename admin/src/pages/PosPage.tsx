import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type PriceMode = 'RETAIL' | 'WHOLESALE';

type ScannedVariant = {
  variantId: string;
  sku: string;
  barcode?: string | null;
  productName: string;
  variantName?: string | null;
  retailPrice: number;
  wholesalePrice: number;
};

type CartItem = {
  variantId: string;
  label: string;
  sku?: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
};

type SoldInvoice = {
  id: string;
  orderNumber: string;
  priceMode: PriceMode;
  priceModeLabel: string;
  invoice?: { invoiceNumber: string } | null;
};

function unitPriceOf(v: { retailPrice: number; wholesalePrice: number }, mode: PriceMode) {
  if (mode === 'WHOLESALE') {
    return v.wholesalePrice > 0 ? v.wholesalePrice : v.retailPrice;
  }
  return v.retailPrice;
}

export function PosPage() {
  const { isOwner } = useAuth();
  const scanRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [priceMode, setPriceMode] = useState<PriceMode>('RETAIL');
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastScan, setLastScan] = useState('');
  const [printAfterSell, setPrintAfterSell] = useState(true);
  const [lastSale, setLastSale] = useState<SoldInvoice | null>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    // أعد التركيز على حقل الباركود بعد كل عملية
    const t = setInterval(() => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button') {
        return;
      }
      scanRef.current?.focus();
    }, 800);
    return () => clearInterval(t);
  }, []);

  function applyMode(mode: PriceMode) {
    if (mode === 'WHOLESALE' && !isOwner) {
      setError('بيع الجملة متاح للمالك فقط');
      return;
    }
    setError('');
    setPriceMode(mode);
    setCart((prev) =>
      prev.map((i) => ({
        ...i,
        unitPrice: unitPriceOf(
          { retailPrice: i.retailPrice, wholesalePrice: i.wholesalePrice },
          mode,
        ),
      })),
    );
    scanRef.current?.focus();
  }

  function addScanned(v: ScannedVariant) {
    const unitPrice = unitPriceOf(v, priceMode);
    const label = `${v.productName}${v.variantName ? ` — ${v.variantName}` : ''} / ${v.sku}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === v.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === v.variantId ? { ...i, quantity: i.quantity + 1, unitPrice } : i,
        );
      }
      return [
        ...prev,
        {
          variantId: v.variantId,
          label,
          sku: v.sku,
          barcode: v.barcode,
          quantity: 1,
          unitPrice,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
        },
      ];
    });
    setLastScan(`${label} → ${money(unitPrice)}`);
    setMessage(`أُضيف: ${v.productName} (${money(unitPrice)})`);
  }

  async function handleScan(raw?: string) {
    const code = (raw ?? barcode).trim();
    if (!code || scanning) return;
    setScanning(true);
    setError('');
    setMessage('');
    try {
      const found = await api<ScannedVariant>(
        `/barcodes/lookup/${encodeURIComponent(code)}`,
      );
      addScanned(found);
      setBarcode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'باركود غير معروف');
      setBarcode('');
    } finally {
      setScanning(false);
      requestAnimationFrame(() => scanRef.current?.focus());
    }
  }

  function onScanKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // قارئات الباركود ترسل Enter بعد الرقم
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleScan();
    }
  }

  function setQty(variantId: string, quantity: number) {
    if (quantity < 1) {
      setCart((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
    );
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
    scanRef.current?.focus();
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - (discountAmount || 0));

  async function sell(withPrint: boolean) {
    setError('');
    setMessage('');
    if (!cart.length) return;
    try {
      const order = await api<SoldInvoice>('/pos/sell', {
        method: 'POST',
        body: JSON.stringify({
          customerPhone: phone || undefined,
          customerName: name || undefined,
          paymentMethod,
          discountAmount: discountAmount || 0,
          priceMode,
          items: cart.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      setLastSale(order);
      setMessage(
        `تم إصدار فاتورة ${order.priceModeLabel}: ${order.invoice?.invoiceNumber || order.orderNumber}`,
      );
      setCart([]);
      setPhone('');
      setName('');
      setDiscountAmount(0);
      setLastScan('');
      if (withPrint && order.id) {
        window.open(`/pos/invoice/${order.id}`, '_blank', 'noopener,noreferrer');
      }
      scanRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل البيع');
    }
  }

  async function checkout(e: FormEvent) {
    e.preventDefault();
    await sell(printAfterSell);
  }

  function printLastInvoice() {
    if (!lastSale?.id) return;
    window.open(`/pos/invoice/${lastSale.id}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>نقطة البيع — مسح باركود</h1>
          <p>امسح الباركود ليُحسب السعر تلقائياً (قطاعي أو جملة) ويُضاف للفاتورة</p>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn${priceMode === 'RETAIL' ? '' : ' secondary'}`}
          onClick={() => applyMode('RETAIL')}
        >
          قطاعي
        </button>
        <button
          type="button"
          className={`btn${priceMode === 'WHOLESALE' ? '' : ' secondary'}`}
          onClick={() => applyMode('WHOLESALE')}
          disabled={!isOwner}
          title={!isOwner ? 'متاح للمالك فقط' : undefined}
        >
          جملة
        </button>
        <span className="badge info" style={{ alignSelf: 'center' }}>
          الأسعار: {priceMode === 'WHOLESALE' ? 'جملة' : 'قطاعي'} — تلقائي من الباركود
        </span>
      </div>

      <div className="panel stack">
        <label>
          مسدس الباركود / إدخال الرمز
          <input
            ref={scanRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={onScanKeyDown}
            placeholder="وجّه الماسح هنا ثم امسح…"
            autoFocus
            autoComplete="off"
            inputMode="none"
            disabled={scanning}
            style={{ fontSize: 22, letterSpacing: 1, padding: '14px 16px' }}
          />
        </label>
        <div className="toolbar">
          <button
            className="btn secondary"
            type="button"
            disabled={scanning || !barcode.trim()}
            onClick={() => void handleScan()}
          >
            {scanning ? 'جارٍ البحث…' : 'بحث وإضافة'}
          </button>
          {lastScan ? (
            <span className="badge success" style={{ alignSelf: 'center' }}>
              آخر مسح: {lastScan}
            </span>
          ) : (
            <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>
              كل مسح يزيد الكمية بـ 1 ويحسب السعر حسب الوضع المختار
            </span>
          )}
        </div>
      </div>

      <form
        className="panel stack"
        onSubmit={(e) => {
          void checkout(e);
        }}
      >
        <div className="form-grid two">
          <label>
            هاتف العميل
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            اسم العميل
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            طريقة الدفع
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">نقداً</option>
              <option value="CARD">بطاقة</option>
              <option value="BANK_TRANSFER">تحويل</option>
            </select>
          </label>
          <label>
            خصم على الفاتورة
            <input
              type="number"
              min={0}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={printAfterSell}
            onChange={(e) => setPrintAfterSell(e.target.checked)}
          />
          طباعة الفاتورة تلقائياً بعد الإصدار
        </label>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الباركود</th>
                <th>الكمية</th>
                <th>سعر محسوب</th>
                <th>الإجمالي</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((i) => (
                <tr key={i.variantId}>
                  <td>{i.label}</td>
                  <td>{i.barcode || i.sku || '—'}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={i.quantity}
                      style={{ width: 72 }}
                      onChange={(e) => setQty(i.variantId, Number(e.target.value) || 1)}
                    />
                  </td>
                  <td>{money(i.unitPrice)}</td>
                  <td>{money(i.quantity * i.unitPrice)}</td>
                  <td>
                    <button className="btn ghost" type="button" onClick={() => removeLine(i.variantId)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {!cart.length ? (
                <tr>
                  <td colSpan={6} className="empty">
                    امسح أول باركود لبدء الفاتورة
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="toolbar" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ marginInlineEnd: 'auto' }}>
            <div className="muted" style={{ fontSize: 13 }}>
              المجموع {money(subtotal)}
              {discountAmount ? ` − خصم ${money(discountAmount)}` : ''}
            </div>
            <strong style={{ fontSize: 22 }}>{money(total)}</strong>
          </div>
          <button
            className="btn secondary"
            type="button"
            disabled={!cart.length}
            onClick={() => void sell(false)}
          >
            إصدار فقط
          </button>
          <button
            className="btn"
            type="button"
            disabled={!cart.length}
            onClick={() => void sell(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              print
            </span>
            إصدار وطباعة الفاتورة
          </button>
        </div>

        {message ? <div className="badge success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}

        {lastSale ? (
          <div
            className="panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              background: 'var(--info-bg, #f3e8ec)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>الفاتورة جاهزة للطباعة</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {lastSale.invoice?.invoiceNumber} · {lastSale.orderNumber} ·{' '}
                {lastSale.priceModeLabel}
              </div>
            </div>
            <button className="btn" type="button" onClick={printLastInvoice}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                print
              </span>
              طباعة الفاتورة
            </button>
            <Link className="btn secondary" to={`/pos/invoice/${lastSale.id}`} target="_blank">
              فتح الفاتورة
            </Link>
          </div>
        ) : null}
      </form>
    </div>
  );
}
