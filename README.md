# دار الأنوثة / Dar Al-Onotha

شركة طرابلس، ليبيا · هاتف: **0921820999** · **0924443839** · عملة: **LYD**

## الهيكل

| المجلد | الدور |
|--------|--------|
| `backend/` | NestJS API + Prisma + SQLite |
| `admin/` | لوحة التحكم (React) → تُبنى على `/admin` |
| `storefront/` | المتجر → يُبنى على `/` |
| `deploy/` | Docker / Nginx / نسخ احتياطي |
| `mobile/` | تطبيقات الجوال (لاحقاً) |

على الإنتاج: المتجر `/` · الإدارة `/admin` · API `/api/v1`

---

## النشر على VPS اقتصادي (1 vCPU / 2GB RAM)

الطريقة الموصى بها: **Docker Compose** (Nginx + API + SQLite — بدون PostgreSQL/Redis).

### 0) على السيرفر — Swap إلزامي لـ 2GB

بدون Swap غالباً يفشل البناء (`OOM`). نفّذ مرة واحدة:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1) تثبيت Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# سجّل خروجاً ثم دخولاً مرة أخرى
```

### 2) رفع المشروع

```bash
cd /opt
sudo git clone YOUR_REPO_URL dar-alunotha
sudo chown -R $USER:$USER /opt/dar-alunotha
cd /opt/dar-alunotha
```

أو ارفع الملفات بـ `scp`/`rsync` إلى `/opt/dar-alunotha`.

### 3) ملف البيئة

```bash
cp .env.example deploy/.env
nano deploy/.env
```

غيّر على الأقل:

- `YOUR-DOMAIN.com` → نطاقك في `APP_URL` و`STORE_URL` و`CORS_ORIGINS`
- `JWT_SECRET` → نص عشوائي ≥ 32 حرفاً

مثال توليد سر:

```bash
openssl rand -base64 48
```

### 4) البناء والتشغيل

```bash
cd /opt/dar-alunotha
docker compose up -d --build
```

أول بناء قد يستغرق 10–20 دقيقة على سيرفر ضعيف. راقب:

```bash
docker compose ps
docker compose logs -f api
```

تحقق:

```bash
curl -s http://127.0.0.1/api/v1/health
```

يفترض أن ترى JSON فيه `"status":"ok"`.

### 5) الدخول وتأمين الحساب

1. افتح: `http://YOUR-DOMAIN/admin`
2. المدير الافتراضي: `admin@dar-alunotha.ly` / `Admin@12345`
3. غيّر كلمة السر فوراً
4. في `deploy/.env` ضع `ALLOW_SEED=false` ثم:

```bash
docker compose up -d api
```

### 6) HTTPS (اختياري لكن مُستحسن)

أسهل خيار: Nginx أو Caddy على المضيف أمام المنفذ 80، أو Certbot بعد توجيه DNS.

```bash
sudo apt install -y certbot
# حسب إعدادك (بروكسي أمام Docker أو استبدال المنفذ 80)
```

---

## أوامر مفيدة

| الأمر | المعنى |
|--------|--------|
| `docker compose ps` | حالة الحاويات |
| `docker compose logs -f` | السجلات |
| `docker compose restart` | إعادة تشغيل |
| `docker compose down` | إيقاف |
| `docker compose up -d --build` | إعادة بناء بعد تحديث الكود |

نسخ احتياطي يومي (SQLite + الصور):

```bash
export SQLITE_PATH=/var/lib/docker/volumes/dar-alunotha_sqlite_data/_data/app.db
export UPLOADS_PATH=/var/lib/docker/volumes/dar-alunotha_uploads_data/_data
# عدّل أسماء الـ volumes إن اختلفت: docker volume ls
bash deploy/backup.sh
```

---

## التشغيل المحلي (تطوير)

### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```
API: http://localhost:3000/api/v1

### Admin
```bash
cd admin && npm install && npm run dev
```
http://localhost:5173

### Storefront
```bash
cd storefront && npm install && npm run dev
```
http://localhost:5174

---

## متغيرات البيئة

انظر [`.env.example`](.env.example) و [`deploy/.env.example`](deploy/.env.example).

| المتغير | مطلوب | ملاحظة |
|----------|--------|--------|
| `APP_URL` / `STORE_URL` | نعم | نطاق HTTPS العام |
| `CORS_ORIGINS` | نعم | نفس النطاق عادة |
| `DATABASE_URL` | نعم | `file:/data/app.db` مع Docker |
| `JWT_SECRET` | نعم | ≥ 32 حرفاً عشوائياً |
| `PORT` | لا | Docker يضبطه على 3000 داخلياً |
| `ALLOW_SEED` | أول تشغيل | ثم `false` |

تفاصيل إضافية: [deploy/README.md](deploy/README.md) (Docker أو Nginx + PM2 بدون Docker).
