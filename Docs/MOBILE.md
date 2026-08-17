# تطبيق الجوال — دار الأنوثة

تطبيق العملاء على **Google Play** و **Apple App Store** يشارك نفس الـ API المركزي مع المتجر الحالي.

```
Android / iOS  ──►  POST/GET /api/v1  ──►  NestJS + Prisma
Admin / Web    ──►  نفس الـ API
```

## جاهز في الـ Backend الآن

| المسار | الوظيفة |
|--------|---------|
| `GET /api/v1/mobile/bootstrap` | إعدادات التطبيق، العملة، الحد الأدنى للإصدار، الصيانة، الروابط |
| `POST /api/v1/mobile/devices` | تسجيل الجهاز ورمز الإشعار (FCM/APNs) |
| `DELETE /api/v1/mobile/devices/:deviceId` | إلغاء تسجيل الجهاز |
| `POST /api/v1/auth/refresh` | تجديد جلسة الجوال |
| `POST /api/v1/auth/logout` | إنهاء جلسة واحدة |
| `POST /api/v1/auth/logout-all` | إنهاء كل الأجهزة |
| `GET /.well-known/apple-app-site-association` | Universal Links |
| `GET /.well-known/assetlinks.json` | Android App Links |

مسارات المتجر الحالية (`/store/*`) هي نفسها التي سيستخدمها التطبيق: منتجات، تصنيفات، تسجيل، دفع، تتبع.

## ترويسات يرسلها التطبيق

```
Authorization: Bearer {accessToken}
X-Client-Platform: ANDROID | IOS
X-App-Version: 1.0.0
X-Device-Id: {uuid-على-الجهاز}
```

## تحديث إجباري

`GET /api/v1/mobile/bootstrap?platform=IOS&version=1.0.0`

يُدار من الإعدادات:

- `mobile.android_min_version` / `mobile.ios_min_version`
- `mobile.android_force_update` / `mobile.ios_force_update`
- `mobile.play_store_url` / `mobile.app_store_url`
- `mobile.maintenance`

## الإشعارات

الرموز تُحفظ في جدول `devices`. الإرسال الفعلي يبدأ بعد تفعيل:

```
FCM_ENABLED=true
APNS_ENABLED=true
```

حتى ذلك الحين، الإشعارات داخل النظام تُسجَّل في قاعدة البيانات والـ push يبقى جاهزاً دون إرسال.

## روابط التطبيق

- مخصص: `daronotha://product/{id}` و `daronotha://r/{page}/{agent}`
- عام: `https://dar-alunotha.ly/...` عبر الملفات في `/.well-known/`

ضعي `MOBILE_IOS_TEAM_ID` وبصمات SHA-256 لأندرويد قبل الإطلاق.

## مجلد التطبيق

انظر `mobile/` — إعداد Expo/EAS وعميل API جاهز للنسخ داخل مشروع Expo عند بدء البناء.
