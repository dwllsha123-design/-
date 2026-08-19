import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '@/api/client';
import { BarcodeScanner } from '@/components/BarcodeScanner';

type ScanResult = {
  id: string;
  orderNumber: string;
  orderBarcode: string;
  status: string;
  alreadyReturned: boolean;
  items: Array<{
    productName: string;
    variantName?: string;
    color?: string;
    size?: string;
    quantity: number;
  }>;
};

export function ReturnToStockPanel() {
  const [barcode, setBarcode] = useState('');
  const [order, setOrder] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [scanOn, setScanOn] = useState(false);

  async function lookup(code: string) {
    setError('');
    setMessage('');
    try {
      const data = await api<ScanResult>(`/returns/scan/${encodeURIComponent(code.trim())}`);
      setBarcode(code.trim());
      setOrder(data);
      if (data.alreadyReturned) {
        setError('تم إرجاع هذا الطلب إلى المخزون مسبقًا.');
      }
      setScanOn(false);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'فشل المسح');
    }
  }

  async function scan(e: FormEvent) {
    e.preventDefault();
    await lookup(barcode);
  }

  async function returnToStock() {
    if (!order) return;
    setError('');
    try {
      await api('/returns/to-stock', {
        method: 'POST',
        body: JSON.stringify({
          barcode: order.orderBarcode,
          reason: 'failed_delivery_return',
        }),
      });
      setMessage('تم إرجاع الطلب إلى المخزون المركزي');
      setOrder({ ...order, alreadyReturned: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإرجاع');
    }
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        امسحي باركود الطلب بالكاميرا أو أدخلية يدوياً (مثل ORD-2026-000001) ثم أرجعي القطع إلى المخزون.
      </p>

      <button className="btn secondary" type="button" onClick={() => setScanOn((v) => !v)}>
        {scanOn ? 'إيقاف الكاميرا' : 'مسح بالكاميرا'}
      </button>
      {scanOn ? <BarcodeScanner active={scanOn} onDetected={(code) => void lookup(code)} /> : null}

      <form className="panel toolbar" onSubmit={scan}>
        <input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="ORD-...."
          style={{ flex: 1 }}
          aria-label="باركود الطلب"
        />
        <button className="btn" type="submit">
          مسح
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="badge success">{message}</div> : null}

      {order ? (
        <div className="panel stack">
          <div className="toolbar">
            <strong>
              {order.orderNumber} / {order.orderBarcode}
            </strong>
            <span className="badge">{order.status}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المواصفات</th>
                  <th>الكمية</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.productName}</td>
                    <td>{i.variantName || [i.color, i.size].filter(Boolean).join(' / ') || '—'}</td>
                    <td>{i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn"
            type="button"
            onClick={returnToStock}
            disabled={order.alreadyReturned}
          >
            إرجاع للمخزون
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReturnsPage() {
  return <Navigate to="/inventory?tab=returns" replace />;
}
