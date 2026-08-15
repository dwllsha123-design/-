import { useEffect, useState } from 'react';
import { api } from '../api/client';

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  user?: { name: string; email?: string | null } | null;
  meta?: unknown;
};

export function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = action ? `?action=${encodeURIComponent(action)}` : '';
    api<Log[]>(`/audit-logs${qs}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [action]);

  return (
    <div className="stack">
      <div className="page-title">
        <h1>سجل النشاط</h1>
        <p>من هنا تعرفين ماذا حدث داخل النظام: من أضاف منتجاً أو طلباً أو عدّل بيانات، ومتى تم ذلك، للمراجعة عند أي اختلاف.</p>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="panel toolbar">
        <label>
          فلتر العملية
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="order.create / product..."
          />
        </label>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>الوقت</th>
              <th>المستخدم</th>
              <th>العملية</th>
              <th>الكيان</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString('ar-LY')}</td>
                <td>{r.user?.name || 'نظام'}</td>
                <td>{r.action}</td>
                <td>
                  {r.entityType}
                  {r.entityId ? ` #${r.entityId.slice(0, 8)}` : ''}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="empty">
                  لا توجد سجلات
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
