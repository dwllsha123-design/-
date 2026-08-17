import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type StoreProduct } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { StoreLink } from '../components/StoreLink';
import { categoryImage } from '../data/catalog';
import { HERO_SLIDES, HOME_IMAGES } from '../data/homeImages';
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
  const [heroIndex, setHeroIndex] = useState(0);
  const categories = useStoreCategories();

  useEffect(() => {
    api<StoreProduct[]>('/store/products?collection=new').then(setNewItems).catch(() => undefined);
    api<StoreProduct[]>('/store/products?collection=bestseller')
      .then(setBestsellers)
      .catch(() => undefined);
    api<StoreProduct[]>('/store/products?collection=offers').then(setOffers).catch(() => undefined);
    api<Banner[]>('/store/banners').then(setBanners).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = categories.slice(0, 4);

  return (
    <>
      <section className="hero-lux">
        <div className="hero-lux-media">
          {HERO_SLIDES.map((src, i) => (
            <img
              key={src}
              className={`hero-lux-slide${i === heroIndex ? ' is-active' : ''}`}
              src={src}
              alt=""
              decoding="async"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
          <div className="hero-dots" aria-hidden>
            {HERO_SLIDES.map((src, i) => (
              <button
                key={src}
                type="button"
                className={i === heroIndex ? 'is-active' : ''}
                onClick={() => setHeroIndex(i)}
                aria-label={`شريحة ${i + 1}`}
              />
            ))}
          </div>
        </div>
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

      <section className="story-lux">
        <div className="container story-lux-grid">
          <div className="story-lux-photo">
            <img src={HOME_IMAGES.comingSoon} alt="أزياء دار الأنوثة" />
          </div>
          <div className="story-lux-copy">
            <span className="kicker">لماذا دار الأنوثة؟</span>
            <h2 className="headline-lg">نعيد تعريف الفخامة البسيطة</h2>
            <p className="body-lg">
              نهتم بأدق التفاصيل من اختيار الأقمشة الفاخرة إلى الخياطة المتقنة، لنضمن لكِ إطلالة تجمع بين
              الراحة والجاذبية في كل الأوقات.
            </p>
            <Link className="btn secondary" to="/products">
              اكتشفي قصتنا
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
                  <img src={b.imageUrl} alt="" loading="lazy" decoding="async" />
                ) : (
                  <div className="banner-fallback" />
                )}
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
              <img src={categoryImage(c.slug)} alt={c.nameAr} loading="lazy" decoding="async" />
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
            <img src="/home/coming-soon.jpg" alt="وصل حديثاً" loading="lazy" decoding="async" />
            <div className="label">
              <span className="chip-new">وصل حديثاً</span>
              <h3 className="headline-lg" style={{ margin: 0 }}>
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
