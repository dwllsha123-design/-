export type StoreCategory = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
};

export const CATEGORY_IMAGES: Record<string, string> = {
  lingerie:
    'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80',
  underwear:
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80',
  robes:
    'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?auto=format&fit=crop&w=700&q=80',
  wigs:
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80',
};

export const FALLBACK_CATEGORIES: StoreCategory[] = [
  { id: 'lingerie', nameAr: 'لانجري', slug: 'lingerie' },
  { id: 'underwear', nameAr: 'ملابس داخلية', slug: 'underwear' },
  { id: 'robes', nameAr: 'أرواب', slug: 'robes' },
  { id: 'wigs', nameAr: 'باروكات', slug: 'wigs' },
];

export function categoryImage(slug: string) {
  return (
    CATEGORY_IMAGES[slug] ||
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'
  );
}
