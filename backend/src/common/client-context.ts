import { ClientPlatform } from '@prisma/client';

export type SessionMeta = {
  deviceId?: string;
  platform: ClientPlatform;
  appVersion?: string;
  userAgent?: string;
  ip?: string;
};

function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseClientPlatform(raw?: string | null): ClientPlatform {
  const v = (raw || '').trim().toUpperCase();
  if (v === 'ANDROID') return ClientPlatform.ANDROID;
  if (v === 'IOS') return ClientPlatform.IOS;
  if (v === 'ADMIN') return ClientPlatform.ADMIN;
  return ClientPlatform.WEB;
}

export function clientMetaFromRequest(
  req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  },
  body?: { deviceId?: string; platform?: string; appVersion?: string },
): SessionMeta {
  return {
    deviceId: body?.deviceId || header(req.headers, 'x-device-id'),
    platform: parseClientPlatform(
      body?.platform || header(req.headers, 'x-client-platform'),
    ),
    appVersion: body?.appVersion || header(req.headers, 'x-app-version'),
    userAgent: header(req.headers, 'user-agent'),
    ip: req.ip,
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mul =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return amount * mul;
}
