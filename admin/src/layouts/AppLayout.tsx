import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

const links = [
  { to: '/', label: 'الرئيسية', icon: 'dashboard', perm: 'reports.view' },
  { to: '/orders', label: 'الطلبات', icon: 'shopping_cart', perm: 'orders.view' },
  { to: '/pos', label: 'نقطة البيع', icon: 'point_of_sale', perm: 'pos.sell' },
  { to: '/products', label: 'المنتجات', icon: 'inventory_2', perm: 'products.view' },
  { to: '/inventory', label: 'المخزون', icon: 'storage', perm: 'inventory.view' },
  { to: '/reservations', label: 'الحجوزات', icon: 'event_available', perm: 'orders.create' },
  { to: '/returns', label: 'إرجاع للمخزون', icon: 'assignment_return', perm: 'inventory.adjust' },
  { to: '/customers', label: 'العملاء', icon: 'group', perm: 'customers.view' },
  { to: '/delivery', label: 'التوصيل', icon: 'local_shipping', perm: 'orders.view' },
  { to: '/commissions', label: 'العمولات', icon: 'payments', perm: 'commissions.view' },
  { to: '/facebook-pages', label: 'الصفحات', icon: 'web', perm: 'facebook_pages.view' },
  { to: '/promos', label: 'كوبونات', icon: 'sell', perm: 'marketing.manage' },
  { to: '/banners', label: 'لافتات', icon: 'view_carousel', perm: 'marketing.manage' },
  { to: '/users', label: 'المستخدمون', icon: 'manage_accounts', perm: 'users.manage' },
  { to: '/audit', label: 'سجل النشاط', icon: 'history', perm: 'audit.view' },
];

type Notif = {
  id: string;
  titleAr: string;
  bodyAr?: string | null;
  type: string;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const initial = (user?.name || 'م').trim().charAt(0);
  const unread = notifs.filter((n) => !n.isRead).length;

  async function loadNotifs() {
    try {
      const rows = await api<Notif[]>('/notifications');
      setNotifs(rows);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  async function markAll() {
    await api('/notifications/read-all', { method: 'POST', body: '{}' });
    await loadNotifs();
  }

  async function approveFromNotif(n: Notif) {
    if (n.type !== 'MARKETER_PENDING' || !n.entityId) return;
    await api(`/users/${n.entityId}/approve-marketer`, { method: 'POST', body: '{}' });
    await api(`/notifications/${n.id}/read`, { method: 'POST', body: '{}' });
    await loadNotifs();
  }

  return (
    <div className="app-shell">
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-name">دار الأنوثة</div>
          <div className="brand-kicker">نظام إدارة التجارة</div>
          <div className="brand-phones">
            طرابلس — ليبيا
            <br />
            0911820999 · 0924443839
          </div>
        </div>

        {hasPermission('orders.create') ? (
          <Link className="nav-cta" to="/orders/new" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            إضافة طلب جديد
          </Link>
        ) : null}

        <nav className="nav">
          {links
            .filter((l) => hasPermission(l.perm))
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={() => setOpen(false)}
              >
                <span className="material-symbols-outlined">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">{user?.name}</div>
          <button className="btn ghost" type="button" onClick={logout}>
            <span>تسجيل الخروج</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              logout
            </span>
          </button>
        </div>
      </aside>

      <div className="content-col">
        <header className="topbar-shell">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="icon-btn mobile-menu-btn"
              aria-label="القائمة"
              onClick={() => setOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="top-search">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="بحث..." aria-label="بحث" />
            </div>
          </div>
          <div className="top-actions" style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="إشعارات"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unread ? (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'var(--danger)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 10,
                    minWidth: 16,
                    height: 16,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {unread}
                </span>
              ) : null}
            </button>
            {notifOpen ? (
              <div
                className="panel"
                style={{
                  position: 'absolute',
                  top: 44,
                  left: 0,
                  width: 340,
                  maxHeight: 420,
                  overflow: 'auto',
                  zIndex: 50,
                  boxShadow: '0 12px 40px rgba(0,0,0,.18)',
                }}
              >
                <div className="toolbar">
                  <strong>الإشعارات</strong>
                  <button className="btn ghost" type="button" onClick={markAll}>
                    تعليم الكل كمقروء
                  </button>
                </div>
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '10px 0',
                      borderTop: '1px solid var(--outline-variant)',
                      opacity: n.isRead ? 0.7 : 1,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{n.titleAr}</div>
                    {n.bodyAr ? (
                      <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{n.bodyAr}</div>
                    ) : null}
                    {n.type === 'MARKETER_PENDING' && n.entityId && hasPermission('users.manage') ? (
                      <button
                        className="btn"
                        type="button"
                        style={{ marginTop: 8 }}
                        onClick={() => approveFromNotif(n)}
                      >
                        موافقة المسوق
                      </button>
                    ) : null}
                  </div>
                ))}
                {!notifs.length ? <div className="empty">لا إشعارات</div> : null}
              </div>
            ) : null}
            <Link to="/users" className="icon-btn" aria-label="إعدادات المستخدمين">
              <span className="material-symbols-outlined">settings</span>
            </Link>
            <div className="avatar" title={user?.name}>
              {initial}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
