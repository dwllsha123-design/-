import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PERMISSION_META,
  ROLE_CODES,
  PERMISSIONS,
} from '../src/common/permissions';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding دار الأنوثة...');

  for (const p of PERMISSION_META) {
    await prisma.permission.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        module: p.module,
      },
      update: {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        module: p.module,
      },
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const byCode = Object.fromEntries(allPermissions.map((p) => [p.code, p]));

  const roleDefs = [
    {
      code: ROLE_CODES.SUPER_ADMIN,
      nameAr: 'المدير العام',
      nameEn: 'Super Admin',
      isSystem: true,
      permissions: allPermissions.map((p) => p.code),
    },
    {
      code: ROLE_CODES.ADMIN,
      nameAr: 'مدير',
      nameEn: 'Admin',
      isSystem: true,
      permissions: allPermissions
        .map((p) => p.code)
        .filter((c) => c !== PERMISSIONS.USERS_MANAGE),
    },
    {
      code: ROLE_CODES.SALES_AGENT,
      nameAr: 'موظف مبيعات',
      nameEn: 'Sales Agent',
      isSystem: true,
      permissions: [
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.FACEBOOK_PAGES_VIEW,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.COMMISSIONS_VIEW,
      ],
    },
    {
      code: ROLE_CODES.CASHIER,
      nameAr: 'كاشير',
      nameEn: 'Cashier',
      isSystem: true,
      permissions: [
        PERMISSIONS.POS_SELL,
        PERMISSIONS.POS_RETURN,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.INVENTORY_VIEW,
      ],
    },
    {
      code: ROLE_CODES.WAREHOUSE,
      nameAr: 'موظف مخزن',
      nameEn: 'Warehouse Employee',
      isSystem: true,
      permissions: [
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_ADJUST,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.ORDERS_VIEW,
      ],
    },
    {
      code: ROLE_CODES.DELIVERY_AGENT,
      nameAr: 'مندوب توصيل',
      nameEn: 'Delivery Agent',
      isSystem: true,
      permissions: [
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.DELIVERY_ASSIGN,
        PERMISSIONS.CUSTOMERS_VIEW,
      ],
    },
    {
      code: ROLE_CODES.CUSTOMER,
      nameAr: 'عميل المتجر',
      nameEn: 'Customer',
      isSystem: true,
      permissions: [
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.CUSTOMERS_EDIT,
      ],
    },
  ];

  for (const role of roleDefs) {
    const saved = await prisma.role.upsert({
      where: { code: role.code },
      create: {
        code: role.code,
        nameAr: role.nameAr,
        nameEn: role.nameEn,
        isSystem: role.isSystem,
      },
      update: {
        nameAr: role.nameAr,
        nameEn: role.nameEn,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    await prisma.rolePermission.createMany({
      data: role.permissions
        .filter((code) => byCode[code])
        .map((code) => ({
          roleId: saved.id,
          permissionId: byCode[code].id,
        })),
    });
  }

  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const superRole = await prisma.role.findUniqueOrThrow({
    where: { code: ROLE_CODES.SUPER_ADMIN },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dar-alunotha.ly' },
    create: {
      name: 'المدير العام',
      email: 'admin@dar-alunotha.ly',
      phone: '0911820999',
      passwordHash,
      locale: 'ar',
      roles: { create: [{ roleId: superRole.id }] },
    },
    update: {
      passwordHash,
      phone: '0911820999',
      status: 'ACTIVE',
    },
  });

  const deliveryRole = await prisma.role.findUniqueOrThrow({
    where: { code: ROLE_CODES.DELIVERY_AGENT },
  });
  const agentHash = await bcrypt.hash('Agent@12345', 10);
  await prisma.user.upsert({
    where: { email: 'agent@dar-alunotha.ly' },
    create: {
      name: 'مندوب طرابلس',
      email: 'agent@dar-alunotha.ly',
      phone: '0920000001',
      passwordHash: agentHash,
      locale: 'ar',
      roles: { create: [{ roleId: deliveryRole.id }] },
    },
    update: {
      passwordHash: agentHash,
      status: 'ACTIVE',
    },
  });

  // شركة خارجية placeholder — API يُربط لاحقاً من المالك
  const existingCompany = await prisma.deliveryCompany.findFirst({
    where: { nameAr: 'شركة توصيل خارجية (قيد الربط)' },
  });
  if (!existingCompany) {
    await prisma.deliveryCompany.create({
      data: {
        nameAr: 'شركة توصيل خارجية (قيد الربط)',
        nameEn: 'External courier (API pending)',
        isActive: false,
      },
    });
  }

  await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    create: {
      code: 'MAIN',
      nameAr: 'المخزن الرئيسي',
      nameEn: 'Main Warehouse',
      isDefault: true,
      address: 'طرابلس - ليبيا',
    },
    update: { isDefault: true, address: 'طرابلس - ليبيا' },
  });

  const settings: Array<{ key: string; value: string; group: string }> = [
    { key: 'app.name', value: 'دار الأنوثة', group: 'app' },
    { key: 'app.locale', value: 'ar', group: 'app' },
    { key: 'app.fallback_locale', value: 'en', group: 'app' },
    { key: 'app.currency', value: 'LYD', group: 'app' },
    { key: 'app.currency_symbol', value: 'د.ل', group: 'app' },
    { key: 'app.timezone', value: 'Africa/Tripoli', group: 'app' },
    { key: 'orders.number_prefix', value: 'ORD', group: 'orders' },
    { key: 'company.city', value: 'طرابلس', group: 'company' },
    { key: 'company.country', value: 'ليبيا', group: 'company' },
    { key: 'company.phone_primary', value: '0911820999', group: 'company' },
    { key: 'company.phone_secondary', value: '0924443839', group: 'company' },
    { key: 'company.address', value: 'طرابلس - ليبيا', group: 'company' },
    { key: 'store.delivery_fee_tripoli', value: '15', group: 'store' },
    { key: 'store.delivery_fee_external', value: '35', group: 'store' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  await prisma.facebookPage.upsert({
    where: { pageId: 'page-demo-001' },
    create: {
      name: 'دار الأنوثة - الصفحة الرئيسية',
      pageId: 'page-demo-001',
      publicCode: 1025,
      status: 'ACTIVE',
    },
    update: { status: 'ACTIVE', publicCode: 1025 },
  });

  await prisma.codeSequence.upsert({
    where: { key: 'page_public_code' },
    create: { key: 'page_public_code', counter: 1025 },
    update: {},
  });
  await prisma.codeSequence.upsert({
    where: { key: 'agent_public_code' },
    create: { key: 'agent_public_code', counter: 2049 },
    update: {},
  });
  await prisma.codeSequence.upsert({
    where: { key: 'variant_barcode' },
    create: { key: 'variant_barcode', counter: 100000 },
    update: {},
  });

  await prisma.setting.upsert({
    where: { key: 'store.url' },
    create: { key: 'store.url', value: 'http://localhost:5173/store', group: 'store' },
    update: {},
  });

  const existingRule = await prisma.commissionRule.findFirst({
    where: { nameAr: 'عمولة مندوبي فيسبوك الافتراضية' },
  });
  if (!existingRule) {
    await prisma.commissionRule.create({
      data: {
        nameAr: 'عمولة مندوبي فيسبوك الافتراضية',
        type: 'PERCENT',
        ratePercent: 5,
        source: 'FACEBOOK',
        isActive: true,
      },
    });
  }

  const categoryDefs = [
    { nameAr: 'لانجري', nameEn: 'Lingerie', slug: 'lingerie', sortOrder: 1 },
    { nameAr: 'ملابس داخلية نسائية', nameEn: 'Underwear', slug: 'underwear', sortOrder: 2 },
    { nameAr: 'أرواب', nameEn: 'Robes', slug: 'robes', sortOrder: 3 },
    { nameAr: 'باروكات', nameEn: 'Wigs', slug: 'wigs', sortOrder: 4 },
  ];

  for (const c of categoryDefs) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: c.sortOrder, isActive: true },
    });
  }

  const lingerie = await prisma.category.findUnique({ where: { slug: 'lingerie' } });
  const underwear = await prisma.category.findUnique({ where: { slug: 'underwear' } });
  const robes = await prisma.category.findUnique({ where: { slug: 'robes' } });
  const wigs = await prisma.category.findUnique({ where: { slug: 'wigs' } });
  const warehouse = await prisma.warehouse.findUnique({ where: { code: 'MAIN' } });

  const demoProducts = [
    {
      sku: 'LIN-001',
      nameAr: 'طقم لانجري حريري',
      categoryId: lingerie?.id,
      retailPrice: 120,
      basePrice: 150,
      color: 'أسود',
      size: 'M',
    },
    {
      sku: 'UND-001',
      nameAr: 'طقم ملابس داخلية قطنية',
      categoryId: underwear?.id,
      retailPrice: 65,
      basePrice: 65,
      color: 'بيج',
      size: 'L',
    },
    {
      sku: 'ROB-001',
      nameAr: 'روب منزلي ناعم',
      categoryId: robes?.id,
      retailPrice: 180,
      basePrice: 210,
      color: 'وردي',
      size: 'One Size',
    },
    {
      sku: 'WIG-001',
      nameAr: 'باروكة طبيعية مموجة',
      categoryId: wigs?.id,
      retailPrice: 350,
      basePrice: 400,
      color: 'بني',
      size: 'متوسط',
    },
  ];

  for (const p of demoProducts) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    const created = await prisma.product.create({
      data: {
        sku: p.sku,
        nameAr: p.nameAr,
        categoryId: p.categoryId,
        retailPrice: p.retailPrice,
        basePrice: p.basePrice,
        status: 'ACTIVE',
        description: `${p.nameAr} — متوفر لدى دار الأنوثة طرابلس`,
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/${p.sku}/800/1000`,
              alt: p.nameAr,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
        },
        variants: {
          create: [
            {
              sku: `${p.sku}-V1`,
              color: p.color,
              size: p.size,
              retailPrice: p.retailPrice,
              price: p.retailPrice,
              nameAr: `${p.color} / ${p.size}`,
            },
          ],
        },
      },
      include: { variants: true },
    });

    if (warehouse && created.variants[0]) {
      await prisma.stockItem.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: warehouse.id,
            variantId: created.variants[0].id,
          },
        },
        create: {
          warehouseId: warehouse.id,
          variantId: created.variants[0].id,
          quantityOnHand: 15,
          quantityReserved: 0,
        },
        update: { quantityOnHand: 15 },
      });
    }
  }

  const year = new Date().getFullYear();
  await prisma.orderSequence.upsert({
    where: { year },
    create: { year, counter: 0 },
    update: {},
  });

  console.log('Seed complete.');
  console.log('Super Admin:', admin.email);
  console.log('Password: Admin@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
