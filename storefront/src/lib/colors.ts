export const STORE_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'أسود', hex: '#1a1a1a' },
  { name: 'أبيض', hex: '#f7f7f7' },
  { name: 'رمادي', hex: '#8a8a8a' },
  { name: 'بيج', hex: '#d8c3a5' },
  { name: 'كريمي', hex: '#f4ead5' },
  { name: 'نود', hex: '#e0b7a0' },
  { name: 'بني', hex: '#6b3f2a' },
  { name: 'ذهبي', hex: '#c9a227' },
  { name: 'فضي', hex: '#c0c0c0' },
  { name: 'أحمر', hex: '#c4392b' },
  { name: 'عنابي', hex: '#7b1e3c' },
  { name: 'وردي', hex: '#e89bb0' },
  { name: 'كحلي', hex: '#1e3a5f' },
  { name: 'أزرق', hex: '#3b6ea5' },
  { name: 'أخضر', hex: '#3d7a5a' },
  { name: 'زيتي', hex: '#6b6e3a' },
  { name: 'بنفسجي', hex: '#6b4c8a' },
  { name: 'برتقالي', hex: '#d96c2c' },
  { name: 'أصفر', hex: '#e4c44a' },
];

export function storeColorHex(name?: string | null) {
  if (!name) return '';
  return STORE_COLORS.find((c) => c.name === name)?.hex || '';
}
