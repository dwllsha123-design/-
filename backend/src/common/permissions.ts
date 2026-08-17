export const PERMISSIONS = {
  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_ASSIGN_DELIVERY: 'orders.assign_delivery',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',

  // POS
  POS_SELL: 'pos.sell',
  POS_RETURN: 'pos.return',

  // Reports
  REPORTS_VIEW: 'reports.view',

  // Commissions
  COMMISSIONS_VIEW: 'commissions.view',
  COMMISSIONS_MANAGE: 'commissions.manage',

  // Delivery
  DELIVERY_APPROVE_AGENT: 'delivery.approve_agent',
  DELIVERY_ASSIGN: 'delivery.assign',

  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_EDIT: 'customers.edit',

  // Facebook
  FACEBOOK_PAGES_VIEW: 'facebook_pages.view',
  FACEBOOK_PAGES_MANAGE: 'facebook_pages.manage',

  // Users / Settings
  USERS_MANAGE: 'users.manage',
  SETTINGS_MANAGE: 'settings.manage',

  // Branches
  BRANCHES_MANAGE: 'branches.manage',

  // Marketing / Audit
  MARKETING_MANAGE: 'marketing.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_META: Array<{
  code: PermissionCode;
  nameAr: string;
  nameEn: string;
  module: string;
}> = [
  { code: PERMISSIONS.ORDERS_VIEW, nameAr: 'عرض الطلبات', nameEn: 'View orders', module: 'orders' },
  { code: PERMISSIONS.ORDERS_CREATE, nameAr: 'إنشاء طلب', nameEn: 'Create order', module: 'orders' },
  { code: PERMISSIONS.ORDERS_EDIT, nameAr: 'تعديل طلب', nameEn: 'Edit order', module: 'orders' },
  { code: PERMISSIONS.ORDERS_CANCEL, nameAr: 'إلغاء طلب', nameEn: 'Cancel order', module: 'orders' },
  { code: PERMISSIONS.ORDERS_ASSIGN_DELIVERY, nameAr: 'تعيين توصيل', nameEn: 'Assign delivery', module: 'orders' },
  { code: PERMISSIONS.PRODUCTS_VIEW, nameAr: 'عرض المنتجات', nameEn: 'View products', module: 'products' },
  { code: PERMISSIONS.PRODUCTS_CREATE, nameAr: 'إنشاء منتج', nameEn: 'Create product', module: 'products' },
  { code: PERMISSIONS.PRODUCTS_EDIT, nameAr: 'تعديل منتج', nameEn: 'Edit product', module: 'products' },
  { code: PERMISSIONS.INVENTORY_VIEW, nameAr: 'عرض المخزون', nameEn: 'View inventory', module: 'inventory' },
  { code: PERMISSIONS.INVENTORY_ADJUST, nameAr: 'تعديل المخزون', nameEn: 'Adjust inventory', module: 'inventory' },
  { code: PERMISSIONS.POS_SELL, nameAr: 'بيع نقطة البيع', nameEn: 'POS sell', module: 'pos' },
  { code: PERMISSIONS.POS_RETURN, nameAr: 'مرتجع نقطة البيع', nameEn: 'POS return', module: 'pos' },
  { code: PERMISSIONS.REPORTS_VIEW, nameAr: 'عرض التقارير', nameEn: 'View reports', module: 'reports' },
  { code: PERMISSIONS.COMMISSIONS_VIEW, nameAr: 'عرض العمولات', nameEn: 'View commissions', module: 'commissions' },
  { code: PERMISSIONS.COMMISSIONS_MANAGE, nameAr: 'إدارة العمولات', nameEn: 'Manage commissions', module: 'commissions' },
  { code: PERMISSIONS.DELIVERY_APPROVE_AGENT, nameAr: 'اعتماد مندوب', nameEn: 'Approve agent', module: 'delivery' },
  { code: PERMISSIONS.DELIVERY_ASSIGN, nameAr: 'تعيين توصيل', nameEn: 'Assign delivery', module: 'delivery' },
  { code: PERMISSIONS.CUSTOMERS_VIEW, nameAr: 'عرض العملاء', nameEn: 'View customers', module: 'customers' },
  { code: PERMISSIONS.CUSTOMERS_CREATE, nameAr: 'إنشاء عميل', nameEn: 'Create customer', module: 'customers' },
  { code: PERMISSIONS.CUSTOMERS_EDIT, nameAr: 'تعديل عميل', nameEn: 'Edit customer', module: 'customers' },
  { code: PERMISSIONS.FACEBOOK_PAGES_VIEW, nameAr: 'عرض صفحات فيسبوك', nameEn: 'View FB pages', module: 'facebook' },
  { code: PERMISSIONS.FACEBOOK_PAGES_MANAGE, nameAr: 'إدارة صفحات فيسبوك', nameEn: 'Manage FB pages', module: 'facebook' },
  { code: PERMISSIONS.USERS_MANAGE, nameAr: 'إدارة المستخدمين', nameEn: 'Manage users', module: 'users' },
  { code: PERMISSIONS.SETTINGS_MANAGE, nameAr: 'إدارة الإعدادات', nameEn: 'Manage settings', module: 'settings' },
  { code: PERMISSIONS.BRANCHES_MANAGE, nameAr: 'إدارة الفروع', nameEn: 'Manage branches', module: 'branches' },
  { code: PERMISSIONS.MARKETING_MANAGE, nameAr: 'إدارة التسويق والعروض', nameEn: 'Manage marketing', module: 'marketing' },
  { code: PERMISSIONS.AUDIT_VIEW, nameAr: 'عرض سجل النشاط', nameEn: 'View audit log', module: 'audit' },
];

export const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALES_AGENT: 'sales_agent',
  CASHIER: 'cashier',
  BRANCH_CASHIER: 'branch_cashier',
  WAREHOUSE: 'warehouse_employee',
  DELIVERY_AGENT: 'delivery_agent',
  CUSTOMER: 'customer',
} as const;
