import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money, type StoreProduct } from '../api/client';
import { useCart, useFavorites } from '../cart/CartContext';
import { ProductGrid } from '../components/ProductCard';

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const fav = useFavorites();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api<StoreProduct>(`/store/products/${id}`)
      .then((p) => {
        setProduct(p);
        setVariantId(p.variants.find((v) => v.inStock)?.id || p.variants[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId),
    [product, variantId],
  );

  const colors = [...new Set((product?.variants || []).map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set((product?.variants || []).map((v) => v.size).filter(Boolean))];

  function addToCart() {
    if (!product || !variant) return;
    if (!variant.inStock) {
      setError('غير متوفر');
      return;
    }
    if (qty > variant.available) {
      setError(`المتوفر ${variant.available} فقط`);
      return;
    }
    add({
      variantId: variant.id,
      productId: product.id,
      nameAr: product.nameAr,
      image: product.images[0]?.url,
      color: variant.color,
      size: variant.size,
      quantity: qty,
      unitPrice: variant.retailPrice,
    });
  }

  if (error && !product) return <div className="container section error">{error}</div>;
  if (!product) return <div className="container section">جارٍ التحميل...</div>;

  return (
    <section className="container section">
      <div className="product-layout">
        <div className="gallery">
          <div className="gallery-main">
            <img
              src={product.images[0]?.url || 'https://picsum.photos/seed/p/800/1000'}
              alt={product.nameAr}
            />
          </div>
        </div>
        <div className="panel stack" style={{ display: 'grid', gap: 14 }}>
          <div className="brand-en">Dar Al-Onotha</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 40 }}>{product.nameAr}</h1>
          <div className="price-row">
            <span className="price" style={{ fontSize: 24 }}>{money(variant?.retailPrice ?? product.retailPrice)}</span>
            {product.compareAtPrice ? <span className="compare">{money(product.compareAtPrice)}</span> : null}
            {product.discountPercent > 0 ? <span className="badge-sale">خصم {product.discountPercent}%</span> : null}
          </div>
          {product.sku ? <div className="muted">SKU: {product.sku}</div> : null}
          <p style={{ lineHeight: 1.8 }}>{product.description || 'تفاصيل المنتج متوفرة عند الطلب.'}</p>

          {colors.length ? (
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>اللون</div>
              <div className="swatches">
                {colors.map((c) => (
                  <button
                    key={String(c)}
                    type="button"
                    className={`chip ${variant?.color === c ? 'active' : ''}`}
                    onClick={() => {
                      const match = product.variants.find((v) => v.color === c && (!variant?.size || v.size === variant.size))
                        || product.variants.find((v) => v.color === c);
                      if (match) setVariantId(match.id);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {sizes.length ? (
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>المقاس</div>
              <div className="sizes">
                {sizes.map((s) => (
                  <button
                    key={String(s)}
                    type="button"
                    className={`chip ${variant?.size === s ? 'active' : ''}`}
                    onClick={() => {
                      const match = product.variants.find((v) => v.size === s && (!variant?.color || v.color === variant.color))
                        || product.variants.find((v) => v.size === s);
                      if (match) setVariantId(match.id);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="muted" style={{ marginBottom: 8 }}>
              المخزون: {variant?.inStock ? `${variant.available} متاح` : 'غير متوفر'}
            </div>
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
              <strong>{qty}</strong>
              <button type="button" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" disabled={!variant?.inStock} onClick={addToCart}>
              إضافة إلى السلة
            </button>
            <button
              className="btn secondary"
              type="button"
              disabled={!variant?.inStock}
              onClick={() => {
                addToCart();
                navigate('/checkout');
              }}
            >
              شراء الآن
            </button>
            <button className="btn ghost" type="button" onClick={() => fav.toggle(product.id)}>
              {fav.has(product.id) ? 'في المفضلة' : 'المفضلة'}
            </button>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 40 }}>
        <div className="section-head"><h2>منتجات مشابهة</h2></div>
        <ProductGrid products={product.related || []} />
      </div>
      <div className="section">
        <div className="section-head"><h2>قد تعجبكِ أيضاً</h2></div>
        <ProductGrid products={product.suggested || []} />
      </div>
      <Link to="/products">متابعة التسوق</Link>
    </section>
  );
}
