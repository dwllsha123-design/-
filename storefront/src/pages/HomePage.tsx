import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StoreProduct } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { StoreLink } from '../components/StoreLink';
import { categoryImage } from '../data/catalog';
import { useStoreCategories } from '../hooks/useStoreCategories';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
};

export function HomePage() {
  const [newItems, setNewItems] = useState<StoreProduct[]>([]);
  const [bestsellers, setBestsellers] = useState<StoreProduct[]>([]);
  const [offers, setOffers] = useState<StoreProduct[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const categories = useStoreCategories();

  useEffect(() => {
    api<StoreProduct[]>('/store/products?collection=new').then(setNewItems).catch(() => undefined);
    api<StoreProduct[]>('/store/products?collection=bestseller')
      .then(setBestsellers)
      .catch(() => undefined);
    api<StoreProduct[]>('/store/products?collection=offers').then(setOffers).catch(() => undefined);
    api<Banner[]>('/store/banners').then(setBanners).catch(() => undefined);
  }, []);

  const featured = categories.slice(0, 4);

  return (
    <>
      <section className="hero-lux">
        <div className="hero-lux-bg" aria-hidden />
        <div className="hero-lux-inner">
          <h1 className="headline-xl">أناقتكِ تبدأ من هنا</h1>
          <p className="body-lg">
            اكتشفي أحدث تشكيلات دار الأنوثة من اللانجري والملابس النسائية والأرواب والباروكات.
            تصاميم تجمع بين الرقي والراحة لتبرز جمالكِ الطبيعي.
          </p>
          <div className="hero-cta">
            <Link className="btn" to="/products">
              تسوّقي الآن
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                arrow_back
              </span>
            </Link>
            <Link className="btn secondary" to="/offers">
              اكتشفي العروض
            </Link>
          </div>
        </div>
      </section>

      {banners.length ? (
        <section className="container section">
          <div className="banner-row">
            {banners.map((b) => (
              <StoreLink key={b.id} className="banner-card" to={b.linkUrl || '/offers'}>
                {b.imageUrl ? (
                  <div className="bg" style={{ backgroundImage: `url('${b.imageUrl}')` }} />
                ) : (
                  <div className="bg banner-fallback" />
                )}
                <div className="veil" />
                <div className="label">
                  <h3 className="headline-md" style={{ margin: 0 }}>
                    {b.title}
                  </h3>
                  {b.subtitle ? <p className="body-md">{b.subtitle}</p> : null}
                </div>
              </StoreLink>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container section">
        <h2 className="headline-lg section-title">تسوقي حسب الفئة</h2>
        <div className="bento">
          {featured.map((c, idx) => (
            <Link
              key={c.id}
              to={`/category/${c.slug}`}
              className={idx === 0 ? 'bento-card span-2' : 'bento-card'}
            >
              <div className="bg" style={{ backgroundImage: `url('${categoryImage(c.slug)}')` }} />
              <div className="veil" />
              <div className="label">
                <h3 className="headline-md" style={{ margin: 0 }}>
                  {c.nameAr}
                </h3>
              </div>
            </Link>
          ))}
          <Link to="/offers" className="bento-card offer">
            <div className="label">
              <span className="material-symbols-outlined" style={{ fontSize: 36, marginBottom: 8 }}>
                local_offer
              </span>
              <h3 className="headline-md" style={{ margin: 0 }}>
                عروض
              </h3>
            </div>
          </Link>
          <Link to="/new" className="bento-card wide new-banner">
            <div
              className="bg"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80')",
                opacity: 0.55,
                mixBlendMode: 'multiply',
              }}
            />
            <div className="label">
              <span className="chip-new">وصل حديثاً</span>
              <h3 className="headline-lg" style={{ margin: 0, color: '#fff' }}>
                أحدث التشكيلات
              </h3>
            </div>
          </Link>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <h2 className="headline-lg">وصل حديثاً</h2>
            <p>قطع جديدة لموسمكِ</p>
          </div>
          <Link className="label-md" to="/new" style={{ color: 'var(--primary)' }}>
            عرض الكل
          </Link>
        </div>
        <ProductGrid products={newItems.slice(0, 4)} />
      </section>

      {offers.length ? (
        <section className="container section">
          <div className="section-head">
            <div>
              <h2 className="headline-lg">العروض الحالية</h2>
              <p>خصومات محدودة على تشكيلات مختارة</p>
            </div>
            <Link className="label-md" to="/offers" style={{ color: 'var(--primary)' }}>
              كل العروض
            </Link>
          </div>
          <ProductGrid products={offers.slice(0, 4)} />
        </section>
      ) : null}

      <section className="container section">
        <div className="section-head">
          <div>
            <h2 className="headline-lg">الأكثر مبيعاً</h2>
            <p>اختيارات عميلاتنا المفضلة</p>
          </div>
          <Link className="label-md" to="/bestseller" style={{ color: 'var(--primary)' }}>
            عرض الكل
          </Link>
        </div>
        <ProductGrid products={bestsellers.slice(0, 4)} />
      </section>
    </>
  );
}
