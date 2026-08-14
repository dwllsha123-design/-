import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, type StoreProduct } from '../api/client';
import { ProductGrid } from '../components/ProductCard';

const titles: Record<string, string> = {
  lingerie: 'لانجري',
  underwear: 'ملابس داخلية نسائية',
  robes: 'أرواب',
  wigs: 'باروكات',
  offers: 'العروض',
  new: 'المنتجات الجديدة',
  bestseller: 'الأكثر مبيعاً',
  products: 'المتجر',
};

type SortKey = 'new' | 'bestseller' | 'price';

export function CatalogPage({
  mode,
}: {
  mode?: 'category' | 'collection' | 'all' | 'search';
}) {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [error, setError] = useState('');
  const [qInput, setQInput] = useState(params.get('q') || '');
  const [sort, setSort] = useState<SortKey>('new');
  const q = params.get('q') || '';

  const collectionSlug =
    mode === 'collection' ? location.pathname.replace('/', '') || slug : slug;

  useEffect(() => {
    let path = '/store/products';
    if (mode === 'category' && slug) path += `?category=${slug}`;
    if (mode === 'collection' && collectionSlug) {
      path += `?collection=${collectionSlug}`;
    }
    if (mode === 'search') {
      if (!q) {
        setProducts([]);
        return;
      }
      path += `?q=${encodeURIComponent(q)}`;
    }
    api<StoreProduct[]>(path)
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [mode, slug, collectionSlug, q]);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sort === 'price') {
      list.sort((a, b) => Number(a.retailPrice) - Number(b.retailPrice));
    } else if (sort === 'bestseller') {
      list.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    } else {
      list.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    return list;
  }, [products, sort]);

  const title =
    mode === 'search'
      ? q
        ? `بحث: ${q}`
        : 'البحث'
      : titles[collectionSlug || slug || 'products'] || titles.products;

  const subtitle =
    mode === 'all'
      ? 'اكتشفي أحدث صيحات الموضة التي تبرز أنوثتك'
      : `${sorted.length} منتج`;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (mode === 'search') {
      setParams(qInput ? { q: qInput } : {});
    } else if (qInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(qInput.trim())}`);
    }
  }

  return (
    <section className="container section">
      <div className="catalog-head">
        <h2 className="headline-xl">{title}</h2>
        <p className="body-lg">{subtitle}</p>
      </div>

      <div className="catalog-toolbar">
        <form className="search-field" onSubmit={onSearch}>
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ابحثي عن فستان، عباية..."
          />
        </form>
        <div className="sort-row hide-scroll">
          <div className="sort-pills">
            <button type="button" className={sort === 'new' ? 'active' : ''} onClick={() => setSort('new')}>
              الأحدث
            </button>
            <button
              type="button"
              className={sort === 'bestseller' ? 'active' : ''}
              onClick={() => setSort('bestseller')}
            >
              الأكثر مبيعاً
            </button>
            <button
              type="button"
              className={sort === 'price' ? 'active' : ''}
              onClick={() => setSort('price')}
            >
              السعر
            </button>
          </div>
          <button type="button" className="btn soft" style={{ borderRadius: 999, padding: '8px 20px' }}>
            تصفية
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              tune
            </span>
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      <ProductGrid products={sorted} />
    </section>
  );
}

export function CategoriesPage() {
  const tiles = [
    {
      to: '/category/underwear',
      title: 'ملابس داخلية',
      image:
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80',
    },
    {
      to: '/category/lingerie',
      title: 'لانجري',
      image:
        'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=700&q=80',
    },
    {
      to: '/category/wigs',
      title: 'باروكات',
      image:
        'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80',
    },
    {
      to: '/category/robes',
      title: 'أرواب',
      image:
        'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?auto=format&fit=crop&w=700&q=80',
    },
    {
      to: '/new',
      title: 'وصل حديثاً',
      image:
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80',
    },
    {
      to: '/offers',
      title: 'عروض خاصة',
      offer: true,
      subtitle: 'اكتشفي أحدث التخفيضات',
    },
    {
      to: '/bestseller',
      title: 'الأكثر مبيعاً',
      image:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=700&q=80',
    },
  ];

  return (
    <section className="container section">
      <div className="section-head">
        <h2 className="headline-lg" style={{ margin: 0 }}>
          التصنيفات
        </h2>
        <Link className="icon-btn" to="/search-box" aria-label="بحث">
          <span className="material-symbols-outlined">search</span>
        </Link>
      </div>
      <div className="cat-grid">
        {tiles.map((t) =>
          t.offer ? (
            <Link key={t.to} to={t.to} className="cat-tile offer-tile">
              <h3>{t.title}</h3>
              <p>{t.subtitle}</p>
            </Link>
          ) : (
            <Link key={t.to} to={t.to} className="cat-tile">
              <div className="bg" style={{ backgroundImage: `url('${t.image}')` }} />
              <div className="veil" />
              <h3>{t.title}</h3>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}
