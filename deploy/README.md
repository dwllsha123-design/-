# رفع دار الأنوثة على سيرفر حقيقي

المتجر على `/` ولوحة التحكم على `/admin`. الـ API على `/api/v1`.

## قبل الرفع

1. انسخ الإعدادات:
   ```bash
   cp deploy/.env.production.example deploy/.env
   ```
2. عدّل `deploy/.env`:
   - `YOUR-DOMAIN.com` → نطاقك
   - `JWT_SECRET` → نص عشوائي طويل
   - توكن المعيار إن وُجد، وإلا اترك `ACCURATESS_ENABLED=false`
3. غيّر كلمات السر الافتراضية بعد أول دخول:
   - المدير: `admin@dar-alunotha.ly` / `Admin@12345`
   - ثم أزل `ALLOW_SEED=true` من `deploy/.env` وأعد تشغيل الخدمة

## الطريقة 1 — Docker (موصى بها)

على السيرفر (Ubuntu) بعد تثبيت Docker ورفع المشروع:

```bash
docker compose up -d --build
```

الموقع: `http://YOUR-DOMAIN`

شهادة HTTPS بعد نجاح التشغيل:

```bash
sudo apt install certbot
# أو ضع Nginx على السيرفر أمام Docker على المنفذ 80/443
```

نسخ احتياطي:

```bash
docker compose exec api ls /data
# انسخ volume sqlite_data و uploads_data يومياً
```

## الطريقة 2 — Node + Nginx + PM2

```bash
sudo mkdir -p /opt/dar-alunotha /var/www/dar-alunotha
# ارفع المشروع إلى /opt/dar-alunotha
cd /opt/dar-alunotha/backend
cp ../deploy/.env.production.example .env
# عدّل .env: DATABASE_URL="file:./prod.db"
npm ci
npx prisma generate
npx prisma migrate deploy
NODE_ENV=production ALLOW_SEED=true npm run prisma:seed
npm run build

cd ../admin
VITE_API_URL=/api/v1 VITE_BASE=/admin/ npm ci
VITE_API_URL=/api/v1 VITE_BASE=/admin/ npm run build
sudo mkdir -p /var/www/dar-alunotha/admin
sudo cp -r dist/* /var/www/dar-alunotha/admin/

cd ../storefront
VITE_API_URL=/api/v1 npm ci
VITE_API_URL=/api/v1 npm run build
sudo cp -r dist/* /var/www/dar-alunotha/

sudo cp /opt/dar-alunotha/deploy/nginx.host.conf /etc/nginx/sites-available/dar-alunotha
sudo ln -sf /etc/nginx/sites-available/dar-alunotha /etc/nginx/sites-enabled/dar-alunotha
sudo nginx -t && sudo systemctl reload nginx

cd /opt/dar-alunotha
npx pm2 start deploy/ecosystem.config.cjs
npx pm2 save
npx pm2 startup
```

ثم:

```bash
sudo certbot --nginx -d YOUR-DOMAIN.com
```

## ما يتغير في الإنتاج

- Swagger `/docs` يُغلق
- CORS يعمل فقط للنطاقات في `CORS_ORIGINS`
- حد لمحاولات تسجيل الدخول
- الـ seed لا يعمل إلا بـ `ALLOW_SEED=true` ولا يعيد كلمة السر إن وُجد الحساب

## بعد الإطلاق

1. دخول الإدارة من `https://YOUR-DOMAIN/admin`
2. تغيير كلمة سر المدير فوراً
3. تجربة طلب من المتجر وصورة منتج وكاشير
4. جدولة `deploy/backup.sh` يومياً
