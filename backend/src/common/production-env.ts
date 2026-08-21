export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function assertProductionEnv() {
  if (!isProduction()) return;

  const secret = process.env.JWT_SECRET || '';
  if (
    !secret ||
    /change-me|REPLACE_WITH/i.test(secret) ||
    secret.length < 32
  ) {
    throw new Error(
      'في الإنتاج يجب تعيين JWT_SECRET عشوائي بطول 32 حرفاً على الأقل (ولا تستخدم القيمة الافتراضية).',
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('في الإنتاج يجب تعيين DATABASE_URL (مثال: file:/data/app.db).');
  }

  const cors = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (!cors.length) {
    throw new Error(
      'في الإنتاج يجب تعيين CORS_ORIGINS بنطاقات الواجهات، مثال: https://dar-alunotha.ly,https://admin.dar-alunotha.ly',
    );
  }

  const appUrl = process.env.APP_URL || '';
  const storeUrl = process.env.STORE_URL || '';
  if (!appUrl || appUrl.includes('localhost')) {
    throw new Error('في الإنتاج يجب تعيين APP_URL إلى عنوان الـ API العام.');
  }
  if (!storeUrl || storeUrl.includes('localhost')) {
    throw new Error('في الإنتاج يجب تعيين STORE_URL إلى عنوان المتجر العام.');
  }
}
