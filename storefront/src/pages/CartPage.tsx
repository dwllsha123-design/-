import { Link } from 'react-router-dom';
import { money } from '../api/client';
import { useCart } from '../cart/CartContext';

export function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();

  if (!items.length) {
    return (
      <section className="container section empty">
        السلة فارغة — <Link to="/products">ابدئي التسوق</Link>
      </section>
    );
  }

  return (
    <section className="container section">
      <div className="section-head">
        <h2>سلة التسوق</h2>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>المواصفات</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.variantId}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {i.image ? <img src={i.image} alt="" width={56} height={70} style={{ objectFit: 'cover', borderRadius: 8 }} /> : null}
                    <span>{i.nameAr}</span>
                  </div>
                </td>
                <td>{[i.color, i.size].filter(Boolean).join(' / ') || '—'}</td>
                <td>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(i.variantId, i.quantity - 1)}>-</button>
                    <span>{i.quantity}</span>
                    <button type="button" onClick={() => setQty(i.variantId, i.quantity + 1)}>+</button>
                  </div>
                </td>
                <td>{money(i.unitPrice)}</td>
                <td>{money(i.unitPrice * i.quantity)}</td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => remove(i.variantId)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="muted">المجموع الفرعي</div>
          <strong style={{ fontSize: 22 }}>{money(subtotal)}</strong>
          <div className="muted">رسوم التوصيل تُحسب في الدفع حسب المدينة</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn secondary" to="/products">متابعة التسوق</Link>
          <Link className="btn" to="/checkout">إتمام الطلب</Link>
        </div>
      </div>
    </section>
  );
}
