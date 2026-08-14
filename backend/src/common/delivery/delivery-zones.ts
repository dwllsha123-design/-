/** مناطق ومدن التوصيل — بدون اختراع شركة خارجية */

export type DeliveryZoneMode = 'OWN_AGENTS' | 'EXTERNAL_COMPANY_PENDING';

export type DeliveryArea = {
  nameAr: string;
  fee?: number; // إن وُجد يتجاوز رسوم المدينة
};

export type DeliveryCity = {
  nameAr: string;
  aliases?: string[];
  mode: DeliveryZoneMode;
  /** رسوم افتراضية للمدينة إن لم تُحدَّد للمنطقة */
  defaultFeeKey: 'tripoli' | 'external';
  areas: DeliveryArea[];
};

export const TRIPOLI_AREAS: DeliveryArea[] = [
  { nameAr: 'المدينة القديمة' },
  { nameAr: 'الدهماني' },
  { nameAr: 'الهضبة' },
  { nameAr: 'الفرناج' },
  { nameAr: 'حي الأندلس' },
  { nameAr: 'النوفليين' },
  { nameAr: 'بن عاشور' },
  { nameAr: 'غوط الشعال' },
  { nameAr: 'أبو سليم' },
  { nameAr: 'عين زارة' },
  { nameAr: 'تاجوراء' },
  { nameAr: 'سوق الجمعة' },
  { nameAr: 'جنزور' },
  { nameAr: 'السراج' },
  { nameAr: 'قصر بن غشير' },
  { nameAr: 'السبعة' },
  { nameAr: 'المعمورة' },
  { nameAr: 'أخرى داخل طرابلس' },
];

export const EXTERNAL_CITIES: DeliveryCity[] = [
  { nameAr: 'مصراتة', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'بنغازي', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'الزاوية', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'صبراتة', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'الخمس', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'زليتن', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'سبها', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'البيضاء', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'درنة', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'طبرق', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'غريان', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'المركز' }, { nameAr: 'أخرى' }] },
  { nameAr: 'مدينة أخرى', mode: 'EXTERNAL_COMPANY_PENDING', defaultFeeKey: 'external', areas: [{ nameAr: 'أخرى' }] },
];

export const DELIVERY_CITIES: DeliveryCity[] = [
  {
    nameAr: 'طرابلس',
    aliases: ['tripoli', 'طرابلس الكبرى'],
    mode: 'OWN_AGENTS',
    defaultFeeKey: 'tripoli',
    areas: TRIPOLI_AREAS,
  },
  ...EXTERNAL_CITIES,
];

export function findDeliveryCity(city?: string): DeliveryCity {
  const n = (city || '').trim().toLowerCase();
  if (!n) return DELIVERY_CITIES[0];
  const found = DELIVERY_CITIES.find((c) => {
    if (c.nameAr === city?.trim()) return true;
    if (c.nameAr.toLowerCase() === n) return true;
    return (c.aliases || []).some((a) => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n));
  });
  if (found) return found;
  // أي مدينة غير معروفة = توصيل خارجي بانتظار API الشركة
  if (n.includes('طرابلس') || n.includes('tripoli')) return DELIVERY_CITIES[0];
  return {
    nameAr: city!.trim(),
    mode: 'EXTERNAL_COMPANY_PENDING',
    defaultFeeKey: 'external',
    areas: [{ nameAr: 'أخرى' }],
  };
}

export function findAreaFee(city: DeliveryCity, area?: string): number | undefined {
  const a = (area || '').trim();
  if (!a) return undefined;
  const match = city.areas.find((x) => x.nameAr === a);
  return match?.fee;
}
