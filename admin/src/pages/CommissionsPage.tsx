import { FormEvent, useEffect, useState } from 'react';
import { api, money } from '../api/client';

type Entry = {
  id: string;
  amount: string | number;
  ratePercent: string | number;
  status: string;
  order: { orderNumber: string; source: string; pagePublicCode?: number; agentPublicCode?: number };
  agent: { name: string };
};

type Rule = {
  id: string;
  nameAr: string;
  type: string;
  ratePercent: string | number;
  source?: string;
  isActive: boolean;
};

export function CommissionsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [nameAr, setNameAr] = useState('عمولة جديدة');
  const [ratePercent, setRatePercent] = useState(5);
  const [error, setError] = useState('');

  async function load() {
    const [e, r] = await Promise.all([
      api<Entry[]>('/commissions/entries'),
      api<Rule[]>('/commissions/rules').catch(() => [] as Rule[]),
    ]);
    setEntries(e);
    setRules(r);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function createRule(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/commissions/rules', {
        method: 'POST',
        body: JSON.stringify({
          nameAr,
          type: 'PERCENT',
          ratePercent,
          source: 'FACEBOOK',
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/commissions/entries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>العمولات</h1>
        <p>من هنا ترين عمولة كل مسوّق أو مندوب حسب الطلبات المرتبطة به أو بصفحته، وفق القواعد المعتمدة في النظام.</p>
      </div>

      <form className="panel form-grid two" onSubmit={createRule}>
        <label>
          اسم القاعدة
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
        </label>
        <label>
          النسبة %
          <input type="number" value={ratePercent} onChange={(e) => setRatePercent(Number(e.target.value))} />
        </label>
        <div>
          <button className="btn" type="submit">
            إضافة قاعدة
          </button>
        </div>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <div className="panel table-wrap">
        <strong>القواعد</strong>
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>النوع</th>
              <th>النسبة</th>
              <th>المصدر</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{r.nameAr}</td>
                <td>{r.type}</td>
                <td>{Number(r.ratePercent)}%</td>
                <td>{r.source || 'ALL'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel table-wrap">
        <strong>سجل العمولات</strong>
        <table>
          <thead>
            <tr>
              <th>الطلب</th>
              <th>المندوب</th>
              <th>الصفحة/المندوب</th>
              <th>النسبة</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.order.orderNumber}</td>
                <td>{e.agent.name}</td>
                <td>
                  {e.order.pagePublicCode ? `#${e.order.pagePublicCode}` : '—'}
                  {e.order.agentPublicCode ? ` / #${e.order.agentPublicCode}` : ''}
                </td>
                <td>{Number(e.ratePercent)}%</td>
                <td>{money(e.amount)}</td>
                <td>
                  <span className="badge">{e.status}</span>
                </td>
                <td>
                  {e.status === 'PENDING' ? (
                    <button className="btn secondary" type="button" onClick={() => setStatus(e.id, 'APPROVED')}>
                      اعتماد
                    </button>
                  ) : null}
                  {e.status === 'APPROVED' ? (
                    <button className="btn" type="button" onClick={() => setStatus(e.id, 'PAID')}>
                      تم الدفع
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
