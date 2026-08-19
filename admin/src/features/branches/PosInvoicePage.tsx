import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, money } from '@/api/client';

type InvoicePayload = {
  id: string;
  orderNumber: string;
  priceMode: 'RETAIL' | 'WHOLESALE';
  priceModeLabel: string;
  paymentMethod: string;
  subtotal: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  currency: string;
  shippingName?: string | null;
  shippingPhone?: string | null;
  createdAt: string;
  notes?: string | null;
  invoice?: { invoiceNumber: string; issuedAt: string; notes?: string | null } | null;
  cashier?: { name: string } | null;
  branchName?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  company: { name: string; city: string; phones: string[] };
  items: Array<{
    productName: string;
    variantName?: string | null;
    sku?: string | null;
    quantity: number;
    unitPrice: string | number;
    discount: string | number;
    lineTotal: string | number;
  }>;
};

const payLabel: Record<string, string> = {
  CASH: 'نقداً',
  CARD: 'بطاقة',
  BANK_TRANSFER: 'تحويل بنكي',
  COD: 'عند الاستلام',
};

export function PosInvoicePage() {
  const { orderId } = useParams();
  const [data, setData] = useState<InvoicePayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    api<InvoicePayload>(`/pos/invoice/${orderId}`)
      .then((d) => {
        setData(d);
        setTimeout(() => window.print(), 450);
      })
      .catch((e) => setError(e.message));
  }, [orderId]);

  if (error) return <div className="login-page">{error}</div>;
  if (!data) return <div className="login-page">جارٍ تجهيز الفاتورة...</div>;

  const isWholesale = data.priceMode === 'WHOLESALE';

  return (
    <div className="pos-invoice" dir="rtl">
      <style>{`
        @page { size: 80mm auto; margin: 6mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .pos-invoice {
          max-width: 380px;
          margin: 0 auto;
          padding: 18px 14px;
          font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif;
          color: #1b1418;
          background: #fff;
        }
        .pos-invoice .brand {
          text-align: center;
          border-bottom: 2px dashed #c9b4bc;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .pos-invoice .brand h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: 0.02em;
        }
        .pos-invoice .brand p { margin: 4px 0; font-size: 12px; color: #5c4a52; }
        .mode-pill {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          background: ${isWholesale ? '#3d2a32' : '#8b5a6b'};
          color: #fff;
        }
        .meta { font-size: 13px; line-height: 1.7; margin-bottom: 12px; }
        .meta strong { display: inline-block; min-width: 88px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 6px 2px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top; }
        th { color: #5c4a52; font-weight: 600; }
        .totals { margin-top: 12px; font-size: 14px; }
        .totals .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .totals .grand { font-size: 20px; font-weight: 800; border-top: 2px solid #1b1418; padding-top: 8px; margin-top: 8px; }
        .foot { text-align: center; margin-top: 16px; font-size: 11px; color: #5c4a52; border-top: 2px dashed #c9b4bc; padding-top: 10px; }
        .actions { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; }
        .actions button {
          border: 0; background: #3d2a32; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer;
        }
      `}</style>

      <div className="actions no-print">
        <button type="button" onClick={() => window.print()}>
          طباعة
        </button>
        <button type="button" onClick={() => window.close()}>
          إغلاق
        </button>
      </div>

      <header className="brand">
        <h1>{data.company.name}</h1>
        <p>{data.company.city}</p>
        <p>{data.company.phones.join(' · ')}</p>
        <div className="mode-pill">فاتورة {data.priceModeLabel}</div>
        {data.branchName ? <p>{data.branchName}</p> : null}
      </header>

      <div className="meta">
        <div>
          <strong>رقم الفاتورة:</strong> {data.invoice?.invoiceNumber || '—'}
        </div>
        <div>
          <strong>رقم الطلب:</strong> {data.orderNumber}
        </div>
        <div>
          <strong>التاريخ:</strong>{' '}
          {new Date(data.invoice?.issuedAt || data.createdAt).toLocaleString('ar-LY')}
        </div>
        <div>
          <strong>الكاشير:</strong> {data.cashier?.name || '—'}
        </div>
        <div>
          <strong>العميل:</strong>{' '}
          {data.shippingName || data.customer?.name || 'عميل نقدي'}
        </div>
        <div>
          <strong>الهاتف:</strong>{' '}
          {data.shippingPhone || data.customer?.phone || '—'}
        </div>
        <div>
          <strong>الدفع:</strong> {payLabel[data.paymentMethod] || data.paymentMethod}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>الصنف</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>المجموع</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, idx) => (
            <tr key={idx}>
              <td>
                {it.productName}
                {it.variantName ? ` — ${it.variantName}` : ''}
                {it.sku ? <div style={{ color: '#7a6670' }}>{it.sku}</div> : null}
              </td>
              <td>{it.quantity}</td>
              <td>{money(it.unitPrice)}</td>
              <td>{money(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div className="row">
          <span>المجموع الفرعي</span>
          <span>{money(data.subtotal)}</span>
        </div>
        {Number(data.discountAmount) > 0 ? (
          <div className="row">
            <span>الخصم</span>
            <span>−{money(data.discountAmount)}</span>
          </div>
        ) : null}
        <div className="row grand">
          <span>الإجمالي ({data.priceModeLabel})</span>
          <span>{money(data.totalAmount)}</span>
        </div>
      </div>

      <footer className="foot">
        <div>شكراً لتعاملكم مع دار الأنوثة</div>
        <div>الأسعار بالدينار الليبي (د.ل)</div>
      </footer>
    </div>
  );
}
