# تطبيق دار الأنوثة — Android + iOS

هذه المجلد **بنية جاهزة** للتطبيق، وليست شاشات التشغيل بعد.

التطبيق يعتمد على **نفس Central API** الذي يستخدمه المتجر ولوحة الإدارة.
لا تُبنَى قاعدة بيانات منفصلة للجوال.

## القرار التقني

| البند | الاختيار |
|--------|----------|
| إطار العمل | **Expo (React Native)** — كود واحد لـ Google Play و App Store |
| اللغة | TypeScript + واجهة عربية RTL |
| المصادقة | JWT access + **refresh token** يُحفظ في SecureStore |
| الإشعارات | FCM (أندرويد) / APNs (آبل) عبر `POST /mobile/devices` |
| الروابط | `daronotha://` + Universal/App Links على `dar-alunotha.ly` |
| البناء | EAS Build (`eas.json`) |

لماذا Expo وليس native منفصل لكل منصة: نفس الكتالوج، السلة، الطلبات، والتتبع موجودة أصلاً في Store API.

## عند بدء البناء لاحقاً

```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript
npx expo install expo-secure-store expo-notifications expo-linking expo-device
```

ثم انقلي ملفات `src/api` و `src/deep-links.ts` إلى مشروع Expo، وضعي `EXPO_PUBLIC_API_URL` من `env.example`.

معرّفات المتاجر مضبوطة مسبقاً:

- Android: `ly.daronotha.store`
- iOS: `ly.daronotha.store`
- Scheme: `daronotha`

غيّري Team ID في `backend/.env` (`MOBILE_IOS_TEAM_ID`) وبصمة التوقيع في إعداد `mobile.android_sha256_fingerprints` قبل تفعيل الروابط العامة.

## تدفق التشغيل في التطبيق

1. عند الفتح: `GET /api/v1/mobile/bootstrap?platform=ANDROID&version=1.0.0`
2. إن `update.forceUpdate` → توجيه للمتجر
3. تسجيل الجهاز: `POST /api/v1/mobile/devices`
4. تسجيل الدخول: `POST /api/v1/store/auth/login` (احفظي `refreshToken`)
5. الكتالوج/السلة/الدفع من مسارات `/store/*` الحالية
6. عند 401: `POST /api/v1/auth/refresh`
7. عند الخروج: `POST /api/v1/auth/logout` ثم `DELETE /api/v1/mobile/devices/:deviceId`

التفاصيل الكاملة في [Docs/MOBILE.md](../Docs/MOBILE.md).
