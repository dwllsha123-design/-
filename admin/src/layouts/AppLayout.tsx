import { useEffect, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

const links = [
  { to: '/', label: 'الرئيسية', icon: 'dashboard', perm: 'reports.view', hint: 'ملخص المبيعات وتنبيهات المخزون' },
  { to: '/orders', label: 'الطلبات', icon: 'shopping_cart', perm: 'orders.view', hint: 'متابعة طلبات الموقع وفيسبوك والمحل' },
  { to: '/pos', label: 'نقطة البيع', icon: 'point_of_sale', perm: 'pos.sell', hint: 'بيع بالمحل عبر مسح الباركود' },
  { to: '/products', label: 'المنتجات', icon: 'inventory_2', perm: 'products.view', hint: 'إضافة المنتجات والصور والمقاسات والباركود' },
  { to: '/inventory', label: 'المخزون', icon: 'storage', perm: 'inventory.view', hint: 'إدخال الكميات ومتابعة المتوفر' },
  { to: '/reservations', label: 'الحجوزات', icon: 'event_available', perm: 'orders.create', hint: 'حجز كمية حتى لا تُباع لغير صاحبها' },
  { to: '/returns', label: 'إرجاع للمخزون', icon: 'assignment_return', perm: 'inventory.adjust', hint: 'إرجاع القطع بعد مسح باركود الطلب' },
  { to: '/customers', label: 'العملاء', icon: 'group', perm: 'customers.view', hint: 'بيانات الزبائن وطلباتهم السابقة' },
  { to: '/delivery', label: 'التوصيل', icon: 'local_shipping', perm: 'orders.view', hint: 'تعيين مندوب أو شركة توصيل وطباعة البوليصة' },
  { to: '/commissions', label: 'العمولات', icon: 'payments', perm: 'commissions.view', hint: 'عمولة المسوّقين والمندوبين' },
  { to: '/facebook-pages', label: 'الصفحات', icon: 'web', perm: 'facebook_pages.view', hint: 'صفحات فيسبوك وروابط المتجر الخاصة بها' },
  { to: '/promos', label: 'كوبونات', icon: 'sell', perm: 'marketing.manage', hint: 'أكواد الخصم للمتجر' },
  { to: '/banners', label: 'لافتات', icon: 'view_carousel', perm: 'marketing.manage', hint: 'صور العروض في واجهة المتجر' },
  { to: '/users', label: 'المستخدمون', icon: 'manage_accounts', perm: 'users.manage', hint: 'الموظفون وصلاحيات كل وظيفة' },
  { to: '/audit', label: 'سجل النشاط', icon: 'history', perm: 'audit.view', hint: 'من عدّل ماذا ومتى' },
];

type Notif = {
  id: string;
  titleAr: string;
  bodyAr?: string | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

function notifHref(n: Notif): string | null {
  if (!n.entityId) return null;
  if (n.entityType === 'Order' || n.type.startsWith('ORDER_')) {
    return `/orders?focus=${encodeURIComponent(n.entityId)}`;
  }
  if (n.entityType === 'Product' || n.type === 'LOW_STOCK') {
    return `/inventory`;
  }
  if (n.entityType === 'User' || n.type.startsWith('MARKETER_')) {
    return `/users`;
  }
  return null;
}

function notifTone(type: string): string | undefined {
  if (type === 'ORDER_DELIVERED' || type === 'MARKETER_APPROVED') return 'var(--success, #1b7f4e)';
  if (type === 'ORDER_DELIVERY_FAILED' || type === 'ORDER_CANCELLED' || type === 'MARKETER_REJECTED') {
    return 'var(--danger)';
  }
  if (type === 'LOW_STOCK' || type === 'ORDER_RETURNED') return 'var(--warning, #b78103)';
  if (type === 'ORDER_CREATED' || type === 'MARKETER_PENDING') return 'var(--primary)';
  return undefined;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} ي`;
}

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const prevUnread = useRef(0);
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
    const t = setInterval(loadNotifs, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (unread > prevUnread.current && prevUnread.current >= 0) {
      const newest = notifs.find((n) => !n.isRead);
      if (newest && document.visibilityState === 'visible') {
        document.title = `(${unread}) ${newest.titleAr}`;
      }
    }
    prevUnread.current = unread;
    if (!unread) {
      document.title = 'دار الأنوثة | لوحة التحكم';
    }
  }, [unread, notifs]);

  async function markAll() {
    await api('/notifications/read-all', { method: 'POST', body: '{}' });
    await loadNotifs();
  }

  async function openNotif(n: Notif) {
    if (!n.isRead) {
      try {
        await api(`/notifications/${n.id}/read`, { method: 'POST', body: '{}' });
      } catch {
        /* ignore */
      }
    }
    setNotifOpen(false);
    await loadNotifs();
    const href = notifHref(n);
    if (href) navigate(href);
  }

  async function approveFromNotif(n: Notif, e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
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
          <Link className="nav-cta" to="/orders/new" title="تسجيل طلب وصل من فيسبوك يدوياً" onClick={() => setOpen(false)}>
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
                title={l.hint}
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
              <span className={`material-symbols-outlined${unread ? ' filled' : ''}`}>notifications</span>
              {unread ? (
                <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
              ) : null}
            </button>
            {notifOpen ? (
              <div className="panel notif-panel" role="dialog" aria-label="الإشعارات">
                <div className="toolbar">
                  <strong>الإشعارات{unread ? ` (${unread})` : ''}</strong>
                  <button className="btn ghost" type="button" onClick={markAll} disabled={!unread}>
                    تعليم الكل كمقروء
                  </button>
                </div>
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-item${n.isRead ? ' read' : ''}`}
                    onClick={() => openNotif(n)}
                  >
                    <div className="notif-item-head">
                      <span style={{ color: notifTone(n.type), fontWeight: 700 }}>{n.titleAr}</span>
                      <span className="notif-time">{relativeTime(n.createdAt)}</span>
                    </div>
                    {n.bodyAr ? <div className="notif-body">{n.bodyAr}</div> : null}
                    {n.type === 'MARKETER_PENDING' && n.entityId && hasPermission('users.manage') ? (
                      <span
                        className="btn"
                        style={{ marginTop: 8, display: 'inline-flex' }}
                        onClick={(e) => approveFromNotif(n, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') approveFromNotif(n, e);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        موافقة المسوق
                      </span>
                    ) : null}
                  </button>
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
