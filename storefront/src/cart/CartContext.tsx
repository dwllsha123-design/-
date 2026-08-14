import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type CartItem = {
  variantId: string;
  productId: string;
  nameAr: string;
  image?: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
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
        setItems((prev) => {
          const existing = prev.find((p) => p.variantId === item.variantId);
          if (existing) {
            return prev.map((p) =>
              p.variantId === item.variantId
                ? { ...p, quantity: p.quantity + item.quantity }
                : p,
            );
          }
          return [...prev, item];
        });
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
