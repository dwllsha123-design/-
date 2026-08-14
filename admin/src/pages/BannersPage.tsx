import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  active: boolean;
};

export function BannersPage() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  async function load() {
    setRows(await api<Banner[]>('/marketing/banners'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/marketing/banners', {
        method: 'POST',
        body: JSON.stringify({
          title,
          subtitle: subtitle || undefined,
          imageUrl: imageUrl || undefined,
          linkUrl: linkUrl || undefined,
          active: true,
        }),
      });
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setLinkUrl('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    }
  }

  async function toggle(b: Banner) {
    await api(`/marketing/banners/${b.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !b.active }),
    });
    await load();
  }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>اللافتات الإعلانية</h1>
        <p>تفعيل أو إيقاف فوري في واجهة المتجر</p>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <form className="panel form-grid two" onSubmit={onCreate}>
        <label>
          العنوان
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          وصف قصير
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <label>
          رابط الصورة
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </label>
        <label>
          رابط الانتقال
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="btn" type="submit">
            إضافة لافتة
          </button>
        </div>
      </form>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>العنوان</th>
              <th>الوصف</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.subtitle || '—'}</td>
                <td>{b.active ? 'مفعّلة' : 'متوقفة'}</td>
                <td>
                  <button className="btn secondary" type="button" onClick={() => toggle(b)}>
                    {b.active ? 'إيقاف' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
