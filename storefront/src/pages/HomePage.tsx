import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StoreProduct } from '../api/client';
import { ProductGrid } from '../components/ProductCard';

const bento = [
  {
    to: '/category/lingerie',
    title: 'لانجري',
    className: 'bento-card span-2',
    image:
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80',
  },
  {
    to: '/category/underwear',
    title: 'ملابس داخلية',
    className: 'bento-card',
    image:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
  },
  {
    to: '/category/robes',
    title: 'أرواب',
    className: 'bento-card',
    image:
      'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?auto=format&fit=crop&w=600&q=80',
  },
  {
    to: '/category/wigs',
    title: 'باروكات',
    className: 'bento-card',
    image:
      'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=600&q=80',
  },
];

export function HomePage() {
  const [newItems, setNewItems] = useState<StoreProduct[]>([]);
  const [bestsellers, setBestsellers] = useState<StoreProduct[]>([]);
  const [banners, setBanners] = useState<
    Array<{ id: string; title: string; subtitle?: string; imageUrl?: string; linkUrl?: string }>
  >([]);

  useEffect(() => {
    api<StoreProduct[]>('/store/products?collection=new').then(setNewItems).catch(() => undefined);
    api<StoreProduct[]>('/store/products?collection=bestseller')
      .then(setBestsellers)
      .catch(() => undefined);
    api<typeof banners>('/store/banners').then(setBanners).catch(() => undefined);
  }, []);

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
          <div className="bento">
            {banners.map((b) => (
              <a
                key={b.id}
                className="bento-card span-2"
                href={b.linkUrl || '/offers'}
                style={{ textDecoration: 'none' }}
              >
                {b.imageUrl ? (
                  <div className="bg" style={{ backgroundImage: `url('${b.imageUrl}')` }} />
                ) : (
                  <div className="bg" style={{ background: 'linear-gradient(120deg,#3d2a32,#8b5a6b)' }} />
                )}
                <div className="veil" />
                <div className="label">
                  <h3 className="headline-md" style={{ margin: 0 }}>
                    {b.title}
                  </h3>
                  {b.subtitle ? <p className="body-md">{b.subtitle}</p> : null}
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container section">
        <h2 className="headline-lg section-title">تسوقي حسب الفئة</h2>
        <div className="bento">
          {bento.map((c) => (
            <Link key={c.to} to={c.to} className={c.className}>
              <div className="bg" style={{ backgroundImage: `url('${c.image}')` }} />
              <div className="veil" />
              <div className="label">
                <h3 className="headline-md" style={{ margin: 0 }}>
                  {c.title}
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
