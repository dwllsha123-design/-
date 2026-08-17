# دار الأنوثة — Central Backend API

API-First backend لنظام إدارة التجارة متعدد القنوات (ملابس / لانجري / باروكات).

## Stack

- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- JWT Auth + RBAC Permissions
- Swagger at `/docs`

## المتطلبات

1. Node.js 20+  
2. PostgreSQL 14+  
3. إنشاء قاعدة بيانات باسم `dar_alunotha`

## التشغيل

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Docs: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

## حساب المدير الافتراضي

- Email: `admin@dar-alunotha.ly`
- Password: `Admin@12345`

## الوحدات الجاهزة (المرحلة 1)

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Mobile | `GET /mobile/bootstrap`, `POST /mobile/devices` — تطبيقات Android / iOS |
| Users | CRUD + roles |
| Customers | CRM أساسي |
| Products | منتجات + variants |
| Orders | إنشاء طلبات + رقم `ORD-YYYY-######` |
| Inventory | مخازن + حركات مخزون |
| Facebook Pages | صفحات + تعيين حتى 3 موظفين |
| Settings | عملة LYD / لغة ar |

## Architecture

```
Admin / Website / Future Apps
            │
            ▼
     NestJS API (/api/v1)
            │
            ▼
     PostgreSQL (Prisma)
```

كل Business Logic داخل الـ Service Layer — جاهز لربط الموقع الحالي وتطبيقات الموبايل لاحقاً على نفس الـ API.
