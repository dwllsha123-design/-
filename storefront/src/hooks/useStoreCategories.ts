import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FALLBACK_CATEGORIES, type StoreCategory } from '../data/catalog';

export function useStoreCategories() {
  const [categories, setCategories] = useState<StoreCategory[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    api<StoreCategory[]>('/store/categories')
      .then((rows) => {
        if (rows?.length) setCategories(rows);
      })
      .catch(() => undefined);
  }, []);

  return categories;
}
