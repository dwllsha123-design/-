import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Page = {
  id: string;
  name: string;
  publicCode: number;
  pageId?: string;
  status: string;
  referralLink?: string;
  shortUrl?: string;
  storefrontUrl?: string;
  _count?: { orders: number };
  employees: Array<{
    role: string;
    agentCode?: number | null;
    user: { id: string; name: string; phone?: string };
  }>;
};

type User = { id: string; name: string };

export function FacebookPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [pageId, setPageId] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function load() {
    const [p, u] = await Promise.all([
      api<Page[]>('/facebook-pages'),
      api<User[]>('/users').catch(() => [] as User[]),
    ]);
    setPages(p);
    setUsers(u);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/facebook-pages', {
        method: 'POST',
        body: JSON.stringify({ name, pageId: pageId || undefined }),
      });
      setName('');
      setPageId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function assignEmployees(e: FormEvent) {
    e.preventDefault();
    if (!selectedPage) return;
    try {
      await api(`/facebook-pages/${selectedPage}/employees`, {
        method: 'PUT',
        body: JSON.stringify({ userIds: employeeIds.slice(0, 3) }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التعيين');
    }
  }

  function toggleEmployee(id: string) {
    setEmployeeIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('تعذر النسخ');
    }
  }

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>إدارة الصفحات</h1>
          <p>كل صفحة لها رابط متجر فريد لتتبع مصدر الطلبات تلقائياً</p>
        </div>
      </div>

      <form className="panel form-grid two" onSubmit={onCreate}>
        <label>
          اسم الصفحة
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Facebook Page ID (اختياري)
          <input value={pageId} onChange={(e) => setPageId(e.target.value)} />
        </label>
        <div>
          <button className="btn" type="submit">
            إنشاء صفحة + رابط فريد
          </button>
        </div>
      </form>

      <form className="panel stack" onSubmit={assignEmployees}>
        <label>
          اختيار الصفحة للتعيين
          <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
            <option value="">اختر</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (#{p.publicCode})
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid two">
          {users.map((u) => (
            <label key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={employeeIds.includes(u.id)}
                onChange={() => toggleEmployee(u.id)}
              />
              {u.name}
            </label>
          ))}
        </div>
        <button className="btn secondary" type="submit">
          حفظ الموظفين (حتى 3)
        </button>
      </form>

      {error ? <div className="error">{error}</div> : null}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>الصفحة</th>
              <th>الرمز</th>
              <th>رابط المتجر الفريد</th>
              <th>الرابط المختصر</th>
              <th>الطلبات</th>
              <th>الموظفون</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{p.status}</div>
                </td>
                <td>#{p.publicCode}</td>
                <td>
                  <div style={{ maxWidth: 280, wordBreak: 'break-all', fontSize: 12 }}>
                    {p.storefrontUrl}
                  </div>
                  <button
                    className="btn sm secondary"
                    type="button"
                    style={{ marginTop: 6 }}
                    onClick={() => copy(p.storefrontUrl || '', `s-${p.id}`)}
                  >
                    {copied === `s-${p.id}` ? 'تم النسخ' : 'نسخ رابط المتجر'}
                  </button>
                </td>
                <td>
                  <code>{p.referralLink || `/r/${p.publicCode}`}</code>
                  <div>
                    <button
                      className="btn sm secondary"
                      type="button"
                      style={{ marginTop: 6 }}
                      onClick={() =>
                        copy(p.shortUrl || `http://localhost:3000/r/${p.publicCode}`, `r-${p.id}`)
                      }
                    >
                      {copied === `r-${p.id}` ? 'تم النسخ' : 'نسخ المختصر'}
                    </button>
                  </div>
                </td>
                <td>{p._count?.orders ?? 0}</td>
                <td>
                  {p.employees
                    .map((e) =>
                      e.agentCode
                        ? `${e.user.name} (#${e.agentCode})`
                        : `${e.user.name} [${e.role}]`,
                    )
                    .join('، ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
