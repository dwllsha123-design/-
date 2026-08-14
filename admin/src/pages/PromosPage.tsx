import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Promo = {
  id: string;
  code: string;
  nameAr?: string | null;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  minOrder: string | number;
  maxUses?: number | null;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  active: boolean;
};

export function PromosPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(0);
  const [maxUses, setMaxUses] = useState('');
  const [endsAt, setEndsAt] = useState('');

  async function load() {
    setRows(await api<Promo[]>('/marketing/promos'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/marketing/promos', {
        method: 'POST',
        body: JSON.stringify({
          code,
          nameAr: nameAr || undefined,
          type,
          value,
          minOrder,
          maxUses: maxUses ? Number(maxUses) : null,
          endsAt: endsAt || null,
          active: true,
        }),
      });
      setCode('');
      setNameAr('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function toggle(p: Promo) {
    await api(`/marketing/promos/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !p.active }),
    });
    await load();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>كوبونات الخصم</h1>
        <p>نسبة أو مبلغ ثابت مع صلاحية زمنية</p>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <form className="panel form-grid two" onSubmit={onCreate}>
        <label>
          الكود
          <input value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
        <label>
          الاسم
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </label>
        <label>
          النوع
          <select value={type} onChange={(e) => setType(e.target.value as 'PERCENT' | 'FIXED')}>
            <option value="PERCENT">نسبة %</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
        </label>
        <label>
          القيمة
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} required />
        </label>
        <label>
          حد أدنى للطلب
          <input type="number" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} />
        </label>
        <label>
          أقصى استخدامات
          <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="بدون حد" />
        </label>
        <label>
          ينتهي في
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn" type="submit">
            إنشاء كوبون
          </button>
        </div>
      </form>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>النوع</th>
              <th>القيمة</th>
              <th>الاستخدام</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.type === 'PERCENT' ? 'نسبة' : 'ثابت'}</td>
                <td>{p.value}{p.type === 'PERCENT' ? '%' : ' د.ل'}</td>
                <td>
                  {p.usedCount}
                  {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                </td>
                <td>{p.active ? 'مفعّل' : 'متوقف'}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => toggle(p)}>
                    {p.active ? 'إيقاف' : 'تفعيل'}
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
