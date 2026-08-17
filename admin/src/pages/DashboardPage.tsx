import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, sourceLabel, statusLabel } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type DashboardData = {
  currency: string;
  today: { orders: number; sales: number };
  week: { orders: number; sales: number };
  month: { orders: number; sales: number };
  pendingOrders: number;
  lowStock: number;
  remainingStockUnits?: number;
  stockSkus?: number;
  pendingMarketers?: number;
  customersCount: number;
  productsCount: number;
  channelSales?: {
    online: { orders: number; sales: number };
    pos: { orders: number; sales: number };
  };
  inventoryValue?: {
    productCount: number;
    skuCount: number;
    pieces: number;
    costTotal: number;
    retailTotal: number;
    wholesaleTotal: number;
    byBranch: Array<{
      branchId: string;
      branchName: string;
      pieces: number;
      costTotal: number;
      retailTotal: number;
      wholesaleTotal: number;
    }>;
  };
  bySource: Array<{ source: string; count: number; total: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    source: string;
    status: string;
    totalAmount: string | number;
    shippingName?: string;
    createdAt: string;
  }>;
};

type Alert = {
  id: string;
  quantityOnHand: number;
  reorderLevel: number;
  level: string;
  variant: { sku?: string; product: { nameAr: string } };
};

export function DashboardPage() {
  const { isOwner } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/reports/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
    api<Alert[]>('/inventory/alerts')
      .then(setAlerts)
      .catch(() => undefined);
  }, []);

  return (
    <div className="stack">
      <div className="topbar">
        <div className="page-title">
          <h1>الرئيسية</h1>
          <p>
            ملخص المنظومة: مبيعات الأونلاين ونقاط بيع الفروع، وقيمة المخزون للمدير العام.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn secondary" to="/branches">
            الفروع
          </Link>
          <Link className="btn secondary" to="/inventory">
            المخزون
          </Link>
          <Link className="btn" to="/orders/new">
            إضافة طلب جديد
          </Link>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {isOwner && data?.inventoryValue ? (
        <div className="panel stack">
          <div className="toolbar">
            <strong>ملخص المخزون — للمدير العام</strong>
            <Link to="/branches">إدارة الفروع</Link>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">إجمالي الأصناف الموجودة</div>
              <div className="stat-value">{data.inventoryValue.productCount}</div>
              <div className="stat-hint">{data.inventoryValue.skuCount} مقاس/لون له كمية</div>
            </div>
            <div className="stat">
              <div className="stat-label">عدد القطع</div>
              <div className="stat-value">{data.inventoryValue.pieces}</div>
              <div className="stat-hint">مجموع الكميات في كل الفروع</div>
            </div>
            <div className="stat">
              <div className="stat-label">إجمالي التكلفة</div>
              <div className="stat-value">{money(data.inventoryValue.costTotal)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">إجمالي البيع قطاعي</div>
              <div className="stat-value">{money(data.inventoryValue.retailTotal)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">إجمالي البيع جملة</div>
              <div className="stat-value">{money(data.inventoryValue.wholesaleTotal)}</div>
            </div>
          </div>
          {data.inventoryValue.byBranch.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الفرع</th>
                    <th>القطع</th>
                    <th>التكلفة</th>
                    <th>قطاعي</th>
                    <th>جملة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventoryValue.byBranch.map((b) => (
                    <tr key={b.branchId}>
                      <td>{b.branchName}</td>
                      <td>{b.pieces}</td>
                      <td>{money(b.costTotal)}</td>
                      <td>{money(b.retailTotal)}</td>
                      <td>{money(b.wholesaleTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {(data?.lowStock || 0) > 0 || alerts.length ? (
        <div className="panel" style={{ borderColor: 'var(--danger)' }}>
          <div className="toolbar">
            <strong>تنبيهات المخزون</strong>
            <Link to="/inventory">إدارة المخزون</Link>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id}>
                {a.level === 'OUT' ? 'نفاد' : 'قرب النفاد'}: {a.variant.product.nameAr} — المتبقي{' '}
                {a.quantityOnHand} (حد {a.reorderLevel})
              </li>
            ))}
            {!alerts.length ? <li>{data?.lowStock} صنف تحت حد التنبيه</li> : null}
          </ul>
        </div>
      ) : null}

      <div className="stats">
        <div className="stat">
          <div className="stat-label">مبيعات الأونلاين (اليوم)</div>
          <div className="stat-value">{money(data?.channelSales?.online?.sales || 0)}</div>
          <div className="stat-hint">{data?.channelSales?.online?.orders ?? 0} طلب موقع/فيسبوك</div>
        </div>
        <div className="stat">
          <div className="stat-label">مبيعات نقطة البيع (اليوم)</div>
          <div className="stat-value">{money(data?.channelSales?.pos?.sales || 0)}</div>
          <div className="stat-hint">{data?.channelSales?.pos?.orders ?? 0} فاتورة محل</div>
        </div>
        <div className="stat">
          <div className="stat-label">المخزون المتبقي</div>
          <div className="stat-value">{data?.remainingStockUnits ?? '—'}</div>
          <div className="stat-hint">{data?.stockSkus ?? 0} صنف في المخزن المركزي</div>
        </div>
        <div className={`stat${(data?.lowStock || 0) > 0 ? ' alert' : ''}`}>
          <div className="stat-label">مخزون منخفض</div>
          <div className="stat-value">{data?.lowStock ?? '—'}</div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">مبيعات اليوم</div>
          <div className="stat-value">{money(data?.today?.sales || 0)}</div>
          <div className="stat-hint">{data?.today?.orders ?? 0} طلب</div>
        </div>
        <div className="stat">
          <div className="stat-label">مبيعات الأسبوع</div>
          <div className="stat-value">{money(data?.week?.sales || 0)}</div>
          <div className="stat-hint">{data?.week?.orders ?? 0} طلب</div>
        </div>
        <div className="stat">
          <div className="stat-label">مبيعات الشهر</div>
          <div className="stat-value">{money(data?.month?.sales || 0)}</div>
          <div className="stat-hint">{data?.month?.orders ?? 0} طلب</div>
        </div>
        <div className="stat">
          <div className="stat-label">قيد التنفيذ</div>
          <div className="stat-value">{data?.pendingOrders ?? '—'}</div>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">مسوقون بانتظار الموافقة</div>
          <div className="stat-value">{data?.pendingMarketers ?? 0}</div>
        </div>
        <div className="stat">
          <div className="stat-label">العملاء</div>
          <div className="stat-value">{data?.customersCount ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">المنتجات</div>
          <div className="stat-value">{data?.productsCount ?? '—'}</div>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <strong>آخر الطلبات</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>المصدر</th>
                <th>العميل</th>
                <th>الحالة</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders || []).map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNumber}</td>
                  <td>{sourceLabel[o.source] || o.source}</td>
                  <td>{o.shippingName || '—'}</td>
                  <td>
                    <span className="badge info">{statusLabel[o.status] || o.status}</span>
                  </td>
                  <td>{money(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PageStatsPanel />
      <AgentStatsPanel />
    </div>
  );
}

function PageStatsPanel() {
  const [rows, setRows] = useState<
    Array<{ pageName: string; pagePublicCode: number | null; orders: number; sales: number }>
  >([]);

  useEffect(() => {
    api<{ pages: typeof rows }>('/reports/by-page')
      .then((d) => setRows(d.pages || []))
      .catch(() => undefined);
  }, []);

  return (
    <div className="panel">
      <div className="toolbar">
        <strong>أداء الصفحات التسويقية</strong>
        <Link to="/orders">عرض الطلبات</Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الصفحة</th>
              <th>الرمز</th>
              <th>الطلبات</th>
              <th>المبيعات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.pageName}-${r.pagePublicCode}`}>
                <td>{r.pageName}</td>
                <td>{r.pagePublicCode ? `#${r.pagePublicCode}` : '—'}</td>
                <td>{r.orders}</td>
                <td>{money(r.sales)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="empty">
                  لا توجد بيانات بعد
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentStatsPanel() {
  const [rows, setRows] = useState<
    Array<{ agentName: string; phone?: string | null; orders: number; sales: number }>
  >([]);

  useEffect(() => {
    api<{ agents: typeof rows }>('/reports/by-agent')
      .then((d) => setRows(d.agents || []))
      .catch(() => undefined);
  }, []);

  return (
    <div className="panel">
      <div className="toolbar">
        <strong>أداء المندوبين (الطلبات اليدوية)</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>المندوب</th>
              <th>الهاتف</th>
              <th>عدد الطلبات</th>
              <th>المبيعات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.agentName}-${r.phone}`}>
                <td>{r.agentName}</td>
                <td>{r.phone || '—'}</td>
                <td>{r.orders}</td>
                <td>{money(r.sales)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="empty">
                  لا توجد بيانات بعد
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
