/**
 * Deep links for Android App Links + iOS Universal Links + custom scheme.
 *
 * Examples:
 *   daronotha://product/clxyz
 *   https://dar-alunotha.ly/product/clxyz
 *   daronotha://r/1025/2050
 */

export type AppRoute =
  | { name: 'home' }
  | { name: 'catalog'; category?: string }
  | { name: 'product'; id: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'order'; orderNumber: string }
  | { name: 'account' }
  | { name: 'referral'; pageCode: string; agentCode?: string };

export function parseAppUrl(url: string): AppRoute | null {
  try {
    const parsed = new URL(url.replace(/^daronotha:/, 'https://app'));
    const parts = parsed.pathname.replace(/\/+$/, '').split('/').filter(Boolean);

    if (parts.length === 0) return { name: 'home' };
    if (parts[0] === 'catalog') return { name: 'catalog', category: parts[1] };
    if (parts[0] === 'product' && parts[1]) return { name: 'product', id: parts[1] };
    if (parts[0] === 'cart') return { name: 'cart' };
    if (parts[0] === 'checkout') return { name: 'checkout' };
    if (parts[0] === 'order' && parts[1]) return { name: 'order', orderNumber: parts[1] };
    if (parts[0] === 'account') return { name: 'account' };
    if (parts[0] === 'r' && parts[1]) {
      return { name: 'referral', pageCode: parts[1], agentCode: parts[2] };
    }
    return { name: 'home' };
  } catch {
    return null;
  }
}

export function buildDeepLink(
  scheme: string,
  route: AppRoute,
): string {
  switch (route.name) {
    case 'product':
      return `${scheme}://product/${route.id}`;
    case 'catalog':
      return route.category
        ? `${scheme}://catalog/${route.category}`
        : `${scheme}://catalog`;
    case 'cart':
      return `${scheme}://cart`;
    case 'checkout':
      return `${scheme}://checkout`;
    case 'order':
      return `${scheme}://order/${route.orderNumber}`;
    case 'account':
      return `${scheme}://account`;
    case 'referral':
      return route.agentCode
        ? `${scheme}://r/${route.pageCode}/${route.agentCode}`
        : `${scheme}://r/${route.pageCode}`;
    default:
      return `${scheme}://`;
  }
}
