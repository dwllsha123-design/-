/**
 * Platform-agnostic API client for the future Expo (Android + iOS) app.
 * Copy these files into the Expo project when you start `npx create-expo-app`.
 */

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
};

export type ClientPlatform = 'ANDROID' | 'IOS' | 'WEB' | 'ADMIN';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  locale?: string;
  roles: string[];
  permissions: string[];
};

export type MobileBootstrap = {
  api: { version: string; baseUrl: string; docsUrl: string };
  company: {
    name: string;
    nameEn: string;
    city: string;
    country: string;
    phones: string[];
    address: string;
    timezone: string;
  };
  locale: string;
  rtl: boolean;
  currency: string;
  currencySymbol: string;
  deliveryFeeTripoli: number;
  deliveryFeeExternal: number;
  storeUrl: string;
  maintenance: { enabled: boolean; messageAr: string };
  apps: {
    android: {
      platform: 'ANDROID';
      packageName: string;
      minVersion: string;
      latestVersion: string;
      forceUpdate: boolean;
      storeUrl: string;
    };
    ios: {
      platform: 'IOS';
      bundleId: string;
      minVersion: string;
      latestVersion: string;
      forceUpdate: boolean;
      storeUrl: string;
    };
  };
  update: {
    needsUpdate: boolean;
    forceUpdate: boolean;
    storeUrl: string;
    latestVersion: string;
    minVersion: string;
  } | null;
  features: {
    guestCheckout: boolean;
    promoCodes: boolean;
    orderTracking: boolean;
    pushNotifications: boolean;
    socialLogin: boolean;
  };
  deepLinks: {
    scheme: string;
    host: string;
    prefixes: string[];
    routes: Record<string, string>;
  };
};

export type ApiClientConfig = {
  baseUrl: string;
  platform: ClientPlatform;
  appVersion: string;
  getDeviceId: () => Promise<string>;
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (tokens: SessionTokens | null) => Promise<void>;
};

export function createApiClient(config: ApiClientConfig) {
  let refreshing: Promise<boolean> | null = null;

  async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('X-Client-Platform', config.platform);
    headers.set('X-App-Version', config.appVersion);
    headers.set('X-Device-Id', await config.getDeviceId());

    const access = await config.getAccessToken();
    if (access) headers.set('Authorization', `Bearer ${access}`);

    const res = await fetch(`${config.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    let json: ApiResponse<T> | null = null;
    if (text) {
      try {
        json = JSON.parse(text) as ApiResponse<T>;
      } catch {
        throw new Error('تعذر قراءة رد الخادم');
      }
    }

    if (res.status === 401 && retry && path !== '/auth/refresh') {
      const ok = await refreshSession();
      if (ok) return request<T>(path, init, false);
    }

    if (!res.ok || !json?.success) {
      throw new Error(json?.message || 'حدث خطأ');
    }
    return json.data as T;
  }

  async function refreshSession() {
    if (!refreshing) {
      refreshing = (async () => {
        const refreshToken = await config.getRefreshToken();
        if (!refreshToken) return false;
        try {
          const tokens = await request<SessionTokens & { user: AuthUser }>(
            '/auth/refresh',
            {
              method: 'POST',
              body: JSON.stringify({ refreshToken }),
            },
            false,
          );
          await config.setTokens(tokens);
          return true;
        } catch {
          await config.setTokens(null);
          return false;
        } finally {
          refreshing = null;
        }
      })();
    }
    return refreshing;
  }

  return {
    request,
    refreshSession,
    bootstrap: (platform: ClientPlatform, version: string) =>
      request<MobileBootstrap>(
        `/mobile/bootstrap?platform=${platform}&version=${encodeURIComponent(version)}`,
      ),
    registerDevice: (body: {
      deviceId: string;
      platform: ClientPlatform;
      pushToken?: string;
      pushProvider?: 'FCM' | 'APNS';
      appVersion?: string;
      osVersion?: string;
      locale?: string;
    }) => request('/mobile/devices', { method: 'POST', body: JSON.stringify(body) }),
    unregisterDevice: (deviceId: string) =>
      request(`/mobile/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' }),
    login: (body: { phone?: string; email?: string; password: string }) =>
      request<SessionTokens & { user: AuthUser }>('/store/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: { name: string; phone: string; password: string; email?: string }) =>
      request<SessionTokens & { user: AuthUser }>('/store/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    logout: async (refreshToken?: string | null) => {
      if (refreshToken) {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
      await config.setTokens(null);
    },
    products: (query = '') => request(`/store/products${query}`),
    product: (id: string) => request(`/store/products/${id}`),
    categories: () => request('/store/categories'),
    deliveryQuote: (city: string, area?: string) => {
      const q = new URLSearchParams({ city });
      if (area) q.set('area', area);
      return request(`/store/delivery-quote?${q.toString()}`);
    },
    checkout: (body: unknown) =>
      request('/store/checkout', { method: 'POST', body: JSON.stringify(body) }),
    checkoutAuth: (body: unknown) =>
      request('/store/checkout/auth', { method: 'POST', body: JSON.stringify(body) }),
    trackOrder: (orderNumber: string, phone: string) =>
      request('/store/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNumber, phone }),
      }),
    me: () => request('/store/me'),
    myOrders: () => request('/store/me/orders'),
  };
}
