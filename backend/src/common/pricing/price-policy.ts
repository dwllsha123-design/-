import { AuthUser } from '../decorators/current-user.decorator';
import { ROLE_CODES } from '../permissions';

const COST_PRICE_KEYS = new Set(['costPrice', 'cost', 'margin', 'profit', 'profitMargin']);

const WHOLESALE_PRICE_KEYS = new Set(['wholesalePrice', 'wholesale']);

/** المدير العام أو فرع الجملة/القطاعي يرى سعر الجملة */
export function canViewWholesalePrices(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (user.roles.includes(ROLE_CODES.SUPER_ADMIN)) return true;
  return user.branch?.type === 'WHOLESALE_RETAIL';
}

/** بيع الجملة من نقطة البيع — للفرع الرئيسي (جملة وقطاعي) فقط */
export function canSellWholesale(user?: AuthUser | null): boolean {
  return user?.branch?.type === 'WHOLESALE_RETAIL';
}

/** تكلفة/هامش — للإدارة والمخزن (بدون سعر الجملة) */
export function canViewCostPrices(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (canViewWholesalePrices(user)) return true;
  return (
    user.roles.includes(ROLE_CODES.ADMIN) ||
    user.roles.includes(ROLE_CODES.WAREHOUSE) ||
    user.permissions.includes('products.edit') ||
    user.permissions.includes('settings.manage')
  );
}

/** Deep-sanitize product payloads: wholesale → super_admin only; cost → privileged roles */
export function sanitizePrices<T>(data: T, user?: AuthUser | null): T {
  const keepWholesale = canViewWholesalePrices(user);
  const keepCost = canViewCostPrices(user);
  if (keepWholesale && keepCost) return data;
  return stripSensitive(data, { keepWholesale, keepCost }) as T;
}

function stripSensitive(
  value: unknown,
  flags: { keepWholesale: boolean; keepCost: boolean },
): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => stripSensitive(v, flags));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!flags.keepWholesale && WHOLESALE_PRICE_KEYS.has(key)) continue;
      if (!flags.keepCost && COST_PRICE_KEYS.has(key)) continue;
      // normalize retail exposure
      if (key === 'basePrice' || key === 'price') {
        out[key] = obj.retailPrice ?? val;
        continue;
      }
      out[key] = stripSensitive(val, flags);
    }
    if ('retailPrice' in obj) {
      out.retailPrice = obj.retailPrice;
      out.price = obj.retailPrice;
      out.basePrice = obj.retailPrice;
    }
    return out;
  }
  return value;
}

export function retailOf(variant: {
  retailPrice?: unknown;
  price?: unknown;
}): number {
  return Number(variant.retailPrice ?? variant.price ?? 0);
}
