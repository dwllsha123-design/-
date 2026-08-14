import { Link } from 'react-router-dom';
import { money, type StoreProduct } from '../api/client';
import { useFavorites } from '../cart/CartContext';

export function ProductCard({ product }: { product: StoreProduct }) {
  const fav = useFavorites();
  const img =
    product.images.find((i) => i.isPrimary)?.url ||
    product.images[0]?.url ||
    'https://picsum.photos/seed/fallback/600/750';

  const isNew =
    product.createdAt &&
    Date.now() - new Date(product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30;

  return (
    <article className="product-card">
      <div className="thumb">
        <Link to={`/product/${product.id}`}>
          {product.discountPercent > 0 ? (
            <span className="badge-sale">-{product.discountPercent}%</span>
          ) : isNew ? (
            <span className="badge-new">جديد</span>
          ) : null}
          <img src={img} alt={product.nameAr} loading="lazy" />
        </Link>
        <button
          className={`fav-btn${fav.has(product.id) ? ' on' : ''}`}
          type="button"
          aria-label="المفضلة"
          onClick={() => fav.toggle(product.id)}
        >
          <span className={`material-symbols-outlined${fav.has(product.id) ? ' filled' : ''}`}>
            favorite
          </span>
        </button>
        <Link className="quick-add" to={`/product/${product.id}`}>
          إضافة سريعة
        </Link>
      </div>
      <div className="body">
        <Link to={`/product/${product.id}`} className="name">
          {product.nameAr}
        </Link>
        <div className="price-row">
          {product.compareAtPrice ? (
            <span className="compare">{money(product.compareAtPrice)}</span>
          ) : null}
          <span className="price">
            {Number(product.retailPrice).toFixed(0)}
            <span className="cur">د.ل</span>
          </span>
        </div>
        {!product.inStock ? <div className="stock-out">غير متوفر</div> : null}
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  if (!products.length) return <div className="empty">لا توجد منتجات حالياً</div>;
  return (
    <div className="grid-products">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
