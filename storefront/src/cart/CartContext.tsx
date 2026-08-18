import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';

export type CartItem = {
  variantId: string;
  productId: string;
  nameAr: string;
  image?: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  available?: number;
  inStock?: boolean;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => boolean;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = 'dar_store_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]') as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      add: (item) => {
        if (item.inStock === false) return false;
        const max = item.available != null ? Math.max(0, item.available) : 99;
        if (max <= 0) return false;
        setItems((prev) => {
          const existing = prev.find((p) => p.variantId === item.variantId);
          if (existing) {
            const nextQty = Math.min(max, existing.quantity + item.quantity);
            if (nextQty <= existing.quantity) return prev;
            return prev.map((p) =>
              p.variantId === item.variantId ? { ...p, quantity: nextQty, available: max, inStock: true } : p,
            );
          }
          return [...prev, { ...item, quantity: Math.min(max, item.quantity), available: max, inStock: true }];
        });
        return true;
      },
      setQty: (variantId, quantity) => {
        setItems((prev) =>
          prev
            .map((p) => (p.variantId === variantId ? { ...p, quantity } : p))
            .filter((p) => p.quantity > 0),
        );
      },
      remove: (variantId) => setItems((prev) => prev.filter((p) => p.variantId !== variantId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart outside provider');
  return ctx;
}

export type VariantStock = { available: number; inStock: boolean };

export function useCartStock() {
  const { items } = useCart();
  const [stock, setStock] = useState<Record<string, VariantStock>>({});
  const [loaded, setLoaded] = useState(!items.length);
  const ids = items.map((i) => i.variantId).join(',');

  useEffect(() => {
    if (!ids) {
      setStock({});
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    api<Record<string, VariantStock>>(`/store/stock?variants=${encodeURIComponent(ids)}`)
      .then((data) => {
        if (!cancelled) setStock(data || {});
      })
      .catch(() => {
        if (!cancelled) setStock({});
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const unavailable = items.filter((i) => stock[i.variantId] && !stock[i.variantId].inStock);
  const canCheckout =
    loaded &&
    items.length > 0 &&
    unavailable.length === 0 &&
    items.every((i) => !stock[i.variantId] || i.quantity <= stock[i.variantId].available);

  return { stock, loaded, unavailable, canCheckout };
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dar_store_favs') || '[]') as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('dar_store_favs', JSON.stringify(ids));
  }, [ids]);

  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
  };
}
