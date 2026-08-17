const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export type ApiUser = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  roles: string[];
  permissions: string[];
  facebookPages?: Array<{ id: string; name: string; status: string }>;
  branch?: {
    id: string;
    name: string;
    username: string;
    type: 'WHOLESALE_RETAIL' | 'RETAIL';
    isMain: boolean;
    warehouseId: string;
  } | null;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: (ApiResponse<T> & T) | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as ApiResponse<T> & T;
    } catch {
      throw new Error('تعذر قراءة رد الخادم');
    }
  }
  if (!res.ok || !json) {
    const message =
      (json as ApiResponse<T> | null)?.message ||
      (res.status === 0 || res.status >= 500
        ? 'تعذر الاتصال بالخادم. تأكدي أن النظام يعمل ثم أعيدي المحاولة.'
        : 'حدث خطأ');
    throw new Error(message);
  }

  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiResponse<T>).data as T;
  }
  return json as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body });
  const json = (await res.json()) as ApiResponse<T> & T;
  if (!res.ok) {
    throw new Error((json as ApiResponse<T>).message || 'فشل رفع الملف');
  }
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiResponse<T>).data as T;
  }
  return json as T;
}

export const money = (value: number | string, currency = 'د.ل') => {
  const n = Number(value || 0);
  return `${n.toLocaleString('ar-LY')} ${currency}`;
};

export const sourceLabel: Record<string, string> = {
  FACEBOOK: 'فيسبوك',
  WEBSITE: 'الموقع',
  POS: 'نقطة البيع',
  WHOLESALE: 'جملة',
  OTHER: 'أخرى',
};

export const statusLabel: Record<string, string> = {
  DRAFT: 'مسودة',
  NEW: 'جديد',
  CONFIRMED: 'مؤكد',
  PREPARING: 'قيد التجهيز',
  READY: 'جاهز',
  ASSIGNED: 'تم التعيين',
  OUT_FOR_DELIVERY: 'في الطريق',
  DELIVERED: 'تم التسليم',
  PARTIALLY_RETURNED: 'مرتجع جزئي',
  RETURNED: 'مرتجع',
  CANCELLED: 'ملغي',
  PENDING: 'معلّق',
  PICKED_UP: 'تم الاستلام',
  IN_TRANSIT: 'في الطريق',
  FAILED: 'تعذر التسليم',
};

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'DELIVERED':
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'READY':
      return 'badge success';
    case 'NEW':
    case 'PREPARING':
    case 'ASSIGNED':
    case 'OUT_FOR_DELIVERY':
      return 'badge info';
    case 'DRAFT':
      return 'badge warning';
    case 'CANCELLED':
    case 'RETURNED':
    case 'PARTIALLY_RETURNED':
    case 'FAILED':
    case 'INACTIVE':
      return 'badge danger';
    default:
      return 'badge';
  }
}
