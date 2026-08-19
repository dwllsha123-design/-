# دار الأنوثة — Omnichannel Commerce Platform

شركة: **دار الأنوثة / Dar Al-Onotha** — طرابلس، ليبيا  
هاتف: **0921820999** · **0924443839**  
عملة: **LYD**

## الهيكل

```
backend/      → Central API (NestJS + Prisma)
admin/        → Admin Dashboard (Central Commerce UI)
storefront/   → متجر العملاء (Lux-Ethereal UI)
mobile/       → بنية تطبيق Android + iOS (نفس الـ API)
Docs/         → التوثيق
README.md
```

## التشغيل

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```
API: http://localhost:3000/api/v1

### Admin
```bash
cd admin
npm install
npm run dev
```
http://localhost:5173  
`admin@dar-alunotha.ly` / `Admin@12345`

### Storefront
```bash
cd storefront
npm install
npm run dev
```
http://localhost:5174

### رفع على سيرفر حقيقي

الخطوات كاملة في [deploy/README.md](deploy/README.md): Docker أو Nginx + PM2، مع لوحة التحكم على `/admin`.


### تطبيقات الجوال (لاحقاً)

البنية جاهزة دون بناء الشاشات: `mobile/` و [Docs/MOBILE.md](Docs/MOBILE.md).  
نفس API: `http://localhost:3000/api/v1/mobile/bootstrap`
