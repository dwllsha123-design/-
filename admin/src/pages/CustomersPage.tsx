import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';

type Customer = {
  id: string;
  name: string;
  phone: string;
  city?: string;
  area?: string;
  totalOrders: number;
  totalPurchases: string | number;
  lastOrderAt?: string;
};

export function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  async function load(search = q) {
    const data = await api<Customer[]>(`/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`);
    setRows(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, city }),
      });
      setName('');
      setPhone('');
      setCity('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>العملاء</h1>
          <p>CRM مركزي لكل القنوات</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="بحث بالاسم أو الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280, height: 36, padding: '0 12px' }}
        />
        <button className="btn secondary" type="button" onClick={() => load()}>
          بحث
        </button>
      </div>

      <form className="panel form-grid two" onSubmit={onCreate}>
        <label>
          الاسم
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          الهاتف
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label>
          المدينة
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <div>
          <button className="btn" type="submit">
            إضافة عميل
          </button>
        </div>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>المدينة</th>
              <th>الطلبات</th>
              <th>إجمالي المشتريات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.city || '—'}</td>
                <td>{c.totalOrders}</td>
                <td>{money(c.totalPurchases)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
