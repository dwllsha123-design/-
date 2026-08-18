import { FormEvent, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { api, apiUpload } from '../api/client';

type Placement = 'HERO' | 'PROMO';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  placement: Placement | string;
  sortOrder: number;
  active: boolean;
  imageFit?: 'cover' | 'contain' | string;
  imageZoom?: number;
  imagePosX?: number;
  imagePosY?: number;
};

type ImageStyle = {
  imageFit: 'cover' | 'contain';
  imageZoom: number;
  imagePosX: number;
  imagePosY: number;
};

function styleFromBanner(b: Partial<Banner>): ImageStyle {
  return {
    imageFit: b.imageFit === 'contain' ? 'contain' : 'cover',
    imageZoom: b.imageZoom ?? 100,
    imagePosX: b.imagePosX ?? 50,
    imagePosY: b.imagePosY ?? 50,
  };
}

function heroImageCss(s: ImageStyle): CSSProperties {
  return {
    objectFit: s.imageFit,
    objectPosition: `${s.imagePosX}% ${s.imagePosY}%`,
    transform: `scale(${s.imageZoom / 100})`,
    transformOrigin: `${s.imagePosX}% ${s.imagePosY}%`,
  };
}

const LINK_PRESETS = [
  { value: '/offers', label: 'صفحة العروض' },
  { value: '/new', label: 'وصل حديثاً' },
  { value: '/products', label: 'كل المنتجات' },
  { value: '/bestseller', label: 'الأكثر مبيعاً' },
  { value: '/categories', label: 'التصنيفات' },
];

function emptyForm(placement: Placement) {
  return {
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: placement === 'HERO' ? '/products' : '/offers',
    sortOrder: 0,
    placement,
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

function ImagePicker({
  preview,
  variant,
  fileMeta,
  onPick,
  onClear,
}: {
  preview: string;
  variant: Placement;
  fileMeta: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function takeFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onPick(file);
  }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        {variant === 'HERO'
          ? 'صورة السلايدر — JPG أو PNG، وتُحفظ WebP تلقائياً. الأفضل 1920×1080 (16:9).'
          : 'صورة اللافتة — JPG أو PNG، وتُحفظ WebP تلقائياً. الأفضل 1920×1080 (16:9).'}
      </div>
      <button
        type="button"
        className={`image-drop${preview ? ' has-image' : ''}${dragOver ? ' drag-over' : ''}${
          variant === 'HERO' ? ' hero' : ''
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          takeFile(e.dataTransfer.files?.[0]);
        }}
      >
        {preview ? (
          <img src={preview} alt="معاينة الصورة قبل الرفع" />
        ) : (
          <div className="image-drop-empty">
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
              add_photo_alternate
            </span>
            <strong>اسحبي الصورة هنا أو اضغطي للاختيار</strong>
            <span>JPG أو PNG أو WEBP — حتى 6 م.ب</span>
          </div>
        )}
        {preview ? <span className="image-drop-badge">معاينة قبل الرفع</span> : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          takeFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="image-drop-actions">
        <button type="button" className="btn secondary" onClick={() => inputRef.current?.click()}>
          {preview ? 'تغيير الصورة' : 'اختيار صورة'}
        </button>
        {preview ? (
          <button type="button" className="btn ghost" onClick={onClear}>
            إزالة
          </button>
        ) : null}
        {fileMeta ? <span className="muted">{fileMeta}</span> : null}
      </div>
    </div>
  );
}

function SizeEditor({
  title,
  imageUrl,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  imageUrl: string;
  initial: ImageStyle;
  onClose: () => void;
  onSave: (style: ImageStyle) => Promise<void>;
}) {
  const [style, setStyle] = useState<ImageStyle>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, posX: style.imagePosX, posY: style.imagePosY };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const nextX = Math.min(100, Math.max(0, drag.current.posX - dx * 0.25));
    const nextY = Math.min(100, Math.max(0, drag.current.posY - dy * 0.25));
    setStyle((s) => ({ ...s, imagePosX: Math.round(nextX), imagePosY: Math.round(nextY) }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      await onSave(style);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المقاس');
      setBusy(false);
    }
  }

  return (
    <div className="size-editor-overlay" role="dialog" aria-label="تعديل مقاس الصورة">
      <div className="size-editor">
        <div className="size-editor-head">
          <strong>تعديل مقاس الصورة</strong>
          <span className="muted">{title}</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          اسحبي الصورة لتحريكها، أو غيّري التكبير والإطار. المعاينة بنفس مقاس سلايدر الرئيسية.
        </p>
        <div
          className="size-editor-preview"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img src={imageUrl} alt="" draggable={false} style={heroImageCss(style)} />
        </div>
        <div className="size-editor-controls">
          <div className="page-tabs" role="tablist" aria-label="إطار الصورة">
            <button
              type="button"
              className={style.imageFit === 'cover' ? 'active' : ''}
              onClick={() => setStyle((s) => ({ ...s, imageFit: 'cover' }))}
            >
              ملء الإطار
            </button>
            <button
              type="button"
              className={style.imageFit === 'contain' ? 'active' : ''}
              onClick={() => setStyle((s) => ({ ...s, imageFit: 'contain' }))}
            >
              إظهار كاملة
            </button>
          </div>
          <label>
            التكبير ({style.imageZoom}%)
            <input
              type="range"
              min={50}
              max={250}
              value={style.imageZoom}
              onChange={(e) => setStyle((s) => ({ ...s, imageZoom: Number(e.target.value) }))}
            />
          </label>
          <label>
            أفقي ({style.imagePosX}%)
            <input
              type="range"
              min={0}
              max={100}
              value={style.imagePosX}
              onChange={(e) => setStyle((s) => ({ ...s, imagePosX: Number(e.target.value) }))}
            />
          </label>
          <label>
            عمودي ({style.imagePosY}%)
            <input
              type="range"
              min={0}
              max={100}
              value={style.imagePosY}
              onChange={(e) => setStyle((s) => ({ ...s, imagePosY: Number(e.target.value) }))}
            />
          </label>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn" type="button" disabled={busy} onClick={() => void save()}>
            {busy ? 'جارٍ الحفظ...' : 'حفظ المقاس'}
          </button>
          <button className="btn secondary" type="button" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function BannersPage() {
  const [tab, setTab] = useState<Placement>('HERO');
  const [rows, setRows] = useState<Banner[]>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm('HERO'));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [fileMeta, setFileMeta] = useState('');
  const [busy, setBusy] = useState(false);
  const [sizing, setSizing] = useState<Banner | null>(null);
  const objectUrlRef = useRef<string>('');

  const visible = rows.filter((b) => (b.placement || 'PROMO') === tab);

  async function load() {
    setRows(await api<Banner[]>('/marketing/banners'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function resetForm(placement = tab) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setEditingId(null);
    setForm(emptyForm(placement));
    setFile(null);
    setPreview('');
    setFileMeta('');
  }

  function switchTab(next: Placement) {
    setTab(next);
    resetForm(next);
  }

  function startEdit(b: Banner) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setEditingId(b.id);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || (tab === 'HERO' ? '/products' : '/offers'),
      sortOrder: b.sortOrder ?? 0,
      placement: (b.placement as Placement) || tab,
    });
    setFile(null);
    setPreview(b.imageUrl || '');
    setFileMeta('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onPickFile(f: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setFile(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => {
      setFileMeta(`${f.name} · ${formatBytes(f.size)} · ${img.naturalWidth}×${img.naturalHeight}`);
    };
    img.src = url;
  }

  function onClearImage() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    setFile(null);
    setFileMeta('');
    setForm((s) => ({ ...s, imageUrl: '' }));
    setPreview('');
  }

  const presetMatch = LINK_PRESETS.some((p) => p.value === form.linkUrl);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!editingId && !file && !form.imageUrl) {
      setError('اختاري صورة أولاً — ستظهر معاينتها فوق قبل الحفظ');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: form.title || (tab === 'HERO' ? `شريحة ${visible.length + 1}` : 'لافتة'),
        subtitle: form.subtitle || undefined,
        imageUrl: file ? undefined : form.imageUrl || undefined,
        linkUrl: tab === 'HERO' ? form.linkUrl || '/products' : form.linkUrl || '/offers',
        sortOrder: Number(form.sortOrder) || 0,
        placement: tab,
      };
      let id = editingId;
      if (editingId) {
        await api(`/marketing/banners/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        const created = await api<Banner>('/marketing/banners', {
          method: 'POST',
          body: JSON.stringify({ ...payload, active: true }),
        });
        id = created.id;
      }
      if (file && id) {
        await apiUpload(`/marketing/banners/${id}/image`, file);
      }
      resetForm(tab);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setBusy(false);
    }
  }

  async function saveSize(style: ImageStyle) {
    if (!sizing) return;
    await api(`/marketing/banners/${sizing.id}`, {
      method: 'PATCH',
      body: JSON.stringify(style),
    });
    setSizing(null);
    await load();
  }

  async function toggle(b: Banner) {
    setError('');
    try {
      await api(`/marketing/banners/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !b.active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير الحالة');
    }
  }

  async function move(b: Banner, dir: -1 | 1) {
    setError('');
    try {
      await api(`/marketing/banners/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: (b.sortOrder || 0) + dir }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير الترتيب');
    }
  }

  async function remove(b: Banner) {
    if (!window.confirm(`حذف «${b.title}»؟ لن تظهر في المتجر.`)) return;
    setError('');
    try {
      await api(`/marketing/banners/${b.id}`, { method: 'DELETE', body: '{}' });
      if (editingId === b.id) resetForm(tab);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الحذف');
    }
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>صور المتجر</h1>
        <p>
          من هنا تتحكمين بصور الصفحة الرئيسية: سلايدر الأعلى ولافتات العروض أسفله. صور المنتجات لا
          تُعرض في السلايدر — استخدمي صوراً إعلانية، ثم اضغطي «تعديل المقاس» لضبط التكبير والإطار.
        </p>
      </div>

      <div className="page-tabs" role="tablist" aria-label="نوع الصور">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'HERO'}
          className={tab === 'HERO' ? 'active' : ''}
          onClick={() => switchTab('HERO')}
        >
          سلايدر الرئيسية
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'PROMO'}
          className={tab === 'PROMO' ? 'active' : ''}
          onClick={() => switchTab('PROMO')}
        >
          لافتات العروض
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <form className="panel form-grid two" onSubmit={onSubmit}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>
            {editingId
              ? tab === 'HERO'
                ? 'تعديل صورة السلايدر'
                : 'تعديل لافتة'
              : tab === 'HERO'
                ? 'إضافة صورة للسلايدر'
                : 'لافتة جديدة'}
          </strong>
        </div>

        <ImagePicker
          preview={preview}
          variant={tab}
          fileMeta={fileMeta}
          onPick={onPickFile}
          onClear={onClearImage}
        />

        {tab === 'PROMO' ? (
          <label style={{ gridColumn: '1 / -1' }}>
            أو الصقي رابط صورة جاهز
            <input
              value={form.imageUrl}
              onChange={(e) => {
                setForm((f) => ({ ...f, imageUrl: e.target.value }));
                if (!file) {
                  setPreview(e.target.value);
                  setFileMeta('');
                }
              }}
              placeholder="https://..."
            />
          </label>
        ) : null}

        <label>
          {tab === 'HERO' ? 'اسم داخلي (اختياري)' : 'العنوان الظاهر على الصورة'}
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required={tab === 'PROMO'}
            placeholder={tab === 'HERO' ? 'مثال: قفتان ذهبي' : 'مثال: عروض نهاية الأسبوع'}
          />
        </label>
        {tab === 'PROMO' ? (
          <label>
            وصف قصير (اختياري)
            <input
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="خصم على تشكيلة مختارة"
            />
          </label>
        ) : (
          <label>
            أين تذهب الزبونة عند الضغط؟ (اختياري)
            <select
              value={presetMatch ? form.linkUrl : '__custom'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  linkUrl: e.target.value === '__custom' ? '' : e.target.value,
                }))
              }
            >
              {LINK_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="__custom">رابط مخصص...</option>
            </select>
          </label>
        )}
        {tab === 'PROMO' ? (
          <label>
            أين تذهب الزبونة عند الضغط؟
            <select
              value={presetMatch ? form.linkUrl : '__custom'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  linkUrl: e.target.value === '__custom' ? '' : e.target.value,
                }))
              }
            >
              {LINK_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value="__custom">رابط مخصص...</option>
            </select>
          </label>
        ) : null}
        <label>
          ترتيب العرض (الأصغر يظهر أولاً)
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
          />
        </label>
        {!presetMatch ? (
          <label style={{ gridColumn: '1 / -1' }}>
            الرابط المخصص
            <input
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="/offers أو https://..."
            />
          </label>
        ) : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy
              ? 'جارٍ الحفظ...'
              : editingId
                ? 'حفظ التعديل'
                : tab === 'HERO'
                  ? 'إضافة الصورة للسلايدر'
                  : 'إضافة لافتة'}
          </button>
          {editingId ? (
            <button className="btn secondary" type="button" onClick={() => resetForm(tab)}>
              إلغاء التعديل
            </button>
          ) : null}
          {editingId && tab === 'HERO' && preview ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                const current = rows.find((r) => r.id === editingId);
                if (current) setSizing(current);
              }}
            >
              تعديل المقاس
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <strong>
          {tab === 'HERO'
            ? 'صور السلايدر الحالية — تظهر أعلى الصفحة الرئيسية حسب الترتيب'
            : 'اللافتات الحالية — تظهر تحت السلايدر حسب الترتيب'}
        </strong>
        <div className={tab === 'HERO' ? 'hero-admin-grid' : ''} style={{ display: tab === 'HERO' ? undefined : 'grid', gap: 14, marginTop: 16 }}>
          {visible.map((b) => (
            <article
              key={b.id}
              className={tab === 'HERO' ? 'hero-admin-card' : undefined}
              style={
                tab === 'HERO'
                  ? { opacity: b.active ? 1 : 0.55 }
                  : {
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr',
                      gap: 14,
                      alignItems: 'center',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 10,
                      opacity: b.active ? 1 : 0.55,
                    }
              }
            >
              {tab === 'HERO' ? (
                b.imageUrl ? (
                  <div className="hero-admin-thumb">
                    <img src={b.imageUrl} alt={b.title} style={heroImageCss(styleFromBanner(b))} />
                  </div>
                ) : (
                  <div className="hero-admin-fallback" />
                )
              ) : (
                <div
                  style={{
                    height: 88,
                    borderRadius: 8,
                    background: b.imageUrl
                      ? `#eee url('${b.imageUrl}') center/cover`
                      : 'linear-gradient(135deg, #f5d0d4, #e8c4b8)',
                  }}
                />
              )}
              <div className={tab === 'HERO' ? 'hero-admin-meta' : undefined}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  <span className={b.active ? 'badge success' : 'badge warning'}>
                    {b.active ? 'مفعّلة' : 'متوقفة'}
                  </span>
                </div>
                {tab === 'PROMO' ? (
                  <>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {b.subtitle || 'بدون وصف'}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      الرابط: {b.linkUrl || '/offers'} · الترتيب: {b.sortOrder}
                    </div>
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    الترتيب: {b.sortOrder}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button className="btn" type="button" onClick={() => startEdit(b)}>
                    تعديل
                  </button>
                  {tab === 'HERO' && b.imageUrl ? (
                    <button className="btn secondary" type="button" onClick={() => setSizing(b)}>
                      تعديل المقاس
                    </button>
                  ) : null}
                  <button className="btn secondary" type="button" onClick={() => void toggle(b)}>
                    {b.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button className="btn ghost" type="button" onClick={() => void remove(b)}>
                    حذف
                  </button>
                  <button className="btn ghost" type="button" onClick={() => void move(b, -1)} title="أعلى">
                    ↑
                  </button>
                  <button className="btn ghost" type="button" onClick={() => void move(b, 1)} title="أسفل">
                    ↓
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!visible.length ? (
            <div className="empty">
              {tab === 'HERO'
                ? 'لا توجد صور في السلايدر بعد — أضيفي الأولى من النموذج أعلاه، أو سيبقى المتجر على الصور الافتراضية.'
                : 'لا توجد لافتات بعد — أضيفي الأولى من النموذج أعلاه'}
            </div>
          ) : null}
        </div>
      </div>
      {sizing?.imageUrl ? (
        <SizeEditor
          title={sizing.title}
          imageUrl={sizing.imageUrl}
          initial={styleFromBanner(sizing)}
          onClose={() => setSizing(null)}
          onSave={saveSize}
        />
      ) : null}
    </div>
  );
}
