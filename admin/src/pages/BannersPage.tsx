import { FormEvent, useEffect, useState } from 'react';
import { api, apiUpload } from '../api/client';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  active: boolean;
};

const LINK_PRESETS = [
  { value: '/offers', label: 'صفحة العروض' },
  { value: '/new', label: 'وصل حديثاً' },
  { value: '/products', label: 'كل المنتجات' },
  { value: '/bestseller', label: 'الأكثر مبيعاً' },
  { value: '/categories', label: 'التصنيفات' },
];

const emptyForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '/offers',
  sortOrder: 0,
};

export function BannersPage() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(await api<Banner[]>('/marketing/banners'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setPreview('');
  }

  function startEdit(b: Banner) {
    setEditingId(b.id);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '/offers',
      sortOrder: b.sortOrder ?? 0,
    });
    setFile(null);
    setPreview(b.imageUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onPickFile(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  const presetMatch = LINK_PRESETS.some((p) => p.value === form.linkUrl);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || undefined,
        imageUrl: form.imageUrl || undefined,
        linkUrl: form.linkUrl || '/offers',
        sortOrder: Number(form.sortOrder) || 0,
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
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setBusy(false);
    }
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
    if (!window.confirm(`حذف اللافتة «${b.title}»؟ لن تظهر في المتجر.`)) return;
    setError('');
    try {
      await api(`/marketing/banners/${b.id}`, { method: 'DELETE', body: '{}' });
      if (editingId === b.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الحذف');
    }
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>اللافتات الإعلانية</h1>
        <p>
          من هنا تضيفين صور العروض في الصفحة الرئيسية للمتجر. المقاسات مأخوذة من الموقع الحالي{' '}
          <a href="https://www.daralonotha.ly" target="_blank" rel="noreferrer">
            daralonotha.ly
          </a>
          : بنر الرئيسية <strong>1920×1080</strong> (نسبة 16:9، ارتفاع العرض لا يقل عن 480px). صورة قسم «قريباً»
          <strong> 1200×1500</strong> (4:5). صور المنتجات <strong>900×1200</strong> (3:4). الشعار مربع{' '}
          <strong>1500×1500</strong> ويُعرض 64px / 72px / 80px.
        </p>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <form className="panel form-grid two" onSubmit={onSubmit}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>{editingId ? 'تعديل لافتة' : 'لافتة جديدة'}</strong>
        </div>
        <label>
          العنوان الظاهر على الصورة
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="مثال: عروض نهاية الأسبوع"
          />
        </label>
        <label>
          وصف قصير (اختياري)
          <input
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            placeholder="خصم على تشكيلة مختارة"
          />
        </label>
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
        <label style={{ gridColumn: '1 / -1' }}>
          صورة اللافتة — ارفعي من جهازك (الأفضل 1920×1080 / 16:9)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          أو الصقي رابط صورة جاهز
          <input
            value={form.imageUrl}
            onChange={(e) => {
              setForm((f) => ({ ...f, imageUrl: e.target.value }));
              if (!file) setPreview(e.target.value);
            }}
            placeholder="https://..."
          />
        </label>
        {preview ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              معاينة
            </div>
            <div
              style={{
                aspectRatio: '16 / 9',
                minHeight: 160,
                borderRadius: 12,
                background: `#2d2926 url('${preview}') center/cover`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(30,27,24,.7), transparent 55%)',
                }}
              />
              <div style={{ position: 'absolute', bottom: 16, right: 16, color: '#fff' }}>
                <strong>{form.title || 'العنوان'}</strong>
                {form.subtitle ? <div style={{ fontSize: 13, opacity: 0.9 }}>{form.subtitle}</div> : null}
              </div>
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة لافتة'}
          </button>
          {editingId ? (
            <button className="btn secondary" type="button" onClick={resetForm}>
              إلغاء التعديل
            </button>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <strong>اللافتات الحالية — تظهر في الرئيسية حسب الترتيب</strong>
        <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          {rows.map((b) => (
            <article
              key={b.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: 14,
                alignItems: 'center',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 10,
                opacity: b.active ? 1 : 0.55,
              }}
            >
              <div
                style={{
                  height: 88,
                  borderRadius: 8,
                  background: b.imageUrl
                    ? `#eee url('${b.imageUrl}') center/cover`
                    : 'linear-gradient(135deg, #f5d0d4, #e8c4b8)',
                }}
              />
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  <span className={b.active ? 'badge success' : 'badge warning'}>
                    {b.active ? 'مفعّلة' : 'متوقفة'}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {b.subtitle || 'بدون وصف'}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  الرابط: {b.linkUrl || '/offers'} · الترتيب: {b.sortOrder}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button className="btn" type="button" onClick={() => startEdit(b)}>
                    تعديل
                  </button>
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
          {!rows.length ? <div className="empty">لا توجد لافتات بعد — أضيفي الأولى من النموذج أعلاه</div> : null}
        </div>
      </div>
    </div>
  );
}
