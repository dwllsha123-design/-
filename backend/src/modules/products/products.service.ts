import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, CreateVariantDto, UpdateProductDto } from './dto/product.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { sanitizePrices, canViewWholesalePrices, canViewCostPrices } from '../../common/pricing/price-policy';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';
import { CodeSequenceService } from '../inventory/services/code-sequence.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
    private readonly codes: CodeSequenceService,
  ) {}

  private pricingFields(user: AuthUser, dto: { costPrice?: number; wholesalePrice?: number }) {
    return {
      costPrice: canViewCostPrices(user) ? dto.costPrice : undefined,
      wholesalePrice: canViewWholesalePrices(user) ? dto.wholesalePrice : undefined,
    };
  }

  async findAll(user: AuthUser, search?: string) {
    const products = await this.prisma.product.findMany({
      where: search
        ? {
            OR: [
              { nameAr: { contains: search } },
              { sku: { contains: search } },
              { brand: { contains: search } },
            ],
          }
        : undefined,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          include: { stockItems: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const withAvailability = await Promise.all(
      products.map(async (p) => ({
        ...p,
        variants: await Promise.all(
          p.variants.map(async (v) => {
            const { available } = await this.inventory.getAvailability(v.id);
            return {
              ...v,
              available,
              inStock: available > 0,
              retailPrice: Number(v.retailPrice || v.price),
            };
          }),
        ),
      })),
    );

    return sanitizePrices(withAvailability, user);
  }

  async findOne(user: AuthUser, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { include: { stockItems: true } },
      },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');

    const variants = await Promise.all(
      product.variants.map(async (v) => {
        const { available } = await this.inventory.getAvailability(v.id);
        return {
          ...v,
          available,
          inStock: available > 0,
          retailPrice: Number(v.retailPrice || v.price),
        };
      }),
    );

    return sanitizePrices({ ...product, variants }, user);
  }

  async create(user: AuthUser, dto: CreateProductDto) {
    const retail = dto.retailPrice ?? dto.basePrice ?? 0;
    const pricing = this.pricingFields(user, dto);
    const baseSku = dto.sku?.trim() || (await this.codes.nextSku());
    const variants = dto.variants?.length
      ? dto.variants
      : [
          {
            sku: baseSku,
            nameAr: dto.nameAr,
            retailPrice: retail,
            costPrice: pricing.costPrice,
            wholesalePrice: pricing.wholesalePrice,
            quantity: 0,
          },
        ];

    const variantRows: Array<{
      sku: string;
      barcode: string;
      nameAr?: string;
      color?: string;
      size?: string;
      imageUrl?: string | null;
      retailPrice: number;
      price: number;
      costPrice?: number;
      wholesalePrice?: number;
      quantity: number;
    }> = [];

    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      const vRetail = v.retailPrice ?? v.price ?? retail;
      const vPricing = this.pricingFields(user, {
        costPrice: v.costPrice ?? pricing.costPrice,
        wholesalePrice: v.wholesalePrice ?? pricing.wholesalePrice,
      });
      const sku = v.sku?.trim() || (await this.codes.nextSku());
      const barcode =
        v.barcode?.trim() ||
        (await this.uniqueVariantBarcode(sku));
      const imageUrl = v.imageUrl?.trim() || null;
      variantRows.push({
        sku,
        barcode,
        nameAr:
          v.nameAr ||
          [v.color, v.size].filter(Boolean).join(' / ') ||
          dto.nameAr,
        color: v.color,
        size: v.size,
        imageUrl,
        retailPrice: vRetail,
        price: vRetail,
        costPrice: vPricing.costPrice,
        wholesalePrice: vPricing.wholesalePrice,
        quantity: Math.max(0, Number(v.quantity || 0)),
      });
    }

    const genericUrls = (dto.imageUrls || []).map((u) => u.trim()).filter(Boolean);
    const colorImages: Array<{ url: string; color: string }> = [];
    for (const row of variantRows) {
      if (!row.color || !row.imageUrl) continue;
      if (colorImages.some((c) => c.color === row.color)) continue;
      colorImages.push({ url: row.imageUrl, color: row.color });
    }

    const imageCreates = [
      ...genericUrls.map((url, idx) => ({
        url,
        sortOrder: idx,
        isPrimary: idx === 0 && colorImages.length === 0,
        color: null as string | null,
        alt: null as string | null,
      })),
      ...colorImages.map((img, idx) => ({
        url: img.url,
        sortOrder: genericUrls.length + idx,
        isPrimary: genericUrls.length === 0 && idx === 0,
        color: img.color,
        alt: img.color,
      })),
    ];

    const product = await this.prisma.product.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        description: dto.description,
        categoryId: dto.categoryId,
        brand: dto.brand,
        sku: baseSku,
        retailPrice: retail,
        basePrice: retail,
        costPrice: pricing.costPrice,
        wholesalePrice: pricing.wholesalePrice,
        isTrackStock: dto.isTrackStock ?? true,
        status: 'ACTIVE',
        variants: {
          create: variantRows.map(({ quantity: _q, ...row }) => row),
        },
        images: imageCreates.length ? { create: imageCreates } : undefined,
      },
      include: { variants: true, images: true, category: true },
    });

    await this.seedVariantStock(user.id, product.variants, variantRows);
    return sanitizePrices(product, user);
  }

  async update(user: AuthUser, id: string, dto: UpdateProductDto) {
    await this.findOne(user, id);
    const retail = dto.retailPrice ?? dto.basePrice;
    const pricing = this.pricingFields(user, dto);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        description: dto.description,
        categoryId: dto.categoryId,
        brand: dto.brand,
        retailPrice: retail,
        basePrice: retail,
        ...(canViewCostPrices(user) && dto.costPrice !== undefined
          ? { costPrice: dto.costPrice }
          : {}),
        ...(canViewWholesalePrices(user) && dto.wholesalePrice !== undefined
          ? { wholesalePrice: dto.wholesalePrice }
          : {}),
        status: dto.status,
      },
      include: { variants: true, images: true },
    });
    return sanitizePrices(product, user);
  }

  async addVariant(user: AuthUser, productId: string, dto: CreateVariantDto) {
    const product = await this.findOne(user, productId);
    const retail = dto.retailPrice ?? dto.price ?? Number(product.retailPrice || 0);
    const pricing = this.pricingFields(user, dto);
    const sku = dto.sku?.trim() || (await this.codes.nextSku());
    const barcode = dto.barcode?.trim() || (await this.uniqueVariantBarcode(sku));
    let imageUrl = dto.imageUrl?.trim() || null;
    if (!imageUrl && dto.color) {
      const sibling = await this.prisma.productVariant.findFirst({
        where: { productId, color: dto.color, imageUrl: { not: null } },
      });
      const colorImage = await this.prisma.productImage.findFirst({
        where: { productId, color: dto.color },
        orderBy: { sortOrder: 'asc' },
      });
      imageUrl = sibling?.imageUrl || colorImage?.url || null;
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku,
        barcode,
        nameAr:
          dto.nameAr ||
          [dto.color, dto.size].filter(Boolean).join(' / ') ||
          undefined,
        color: dto.color,
        size: dto.size,
        imageUrl,
        retailPrice: retail,
        price: retail,
        costPrice: pricing.costPrice,
        wholesalePrice: pricing.wholesalePrice,
      },
    });

    if (imageUrl && dto.color) {
      await this.ensureColorImage(productId, dto.color, imageUrl);
    }

    const qty = Math.max(0, Number(dto.quantity || 0));
    await this.seedVariantStock(user.id, [variant], [{ sku, quantity: qty }]);
    return sanitizePrices(variant, user);
  }

  private async uniqueVariantBarcode(sku: string) {
    const seq = await this.codes.nextCode('variant_barcode', 100000);
    const fromSku = this.codes.variantBarcodeFromParts(sku, seq);
    const clash = await this.prisma.productVariant.findFirst({
      where: { OR: [{ barcode: fromSku }, { sku: fromSku }] },
    });
    if (!clash) return fromSku;
    return `DA-V${String(seq).padStart(8, '0')}`;
  }

  private async seedVariantStock(
    actorId: string,
    created: Array<{ id: string; sku: string }>,
    rows: Array<{ sku: string; quantity: number }>,
  ) {
    const warehouseId = await this.inventory.defaultWarehouseId();
    await this.inventory.withTransaction(async (tx) => {
      for (const v of created) {
        await this.inventory.getOrCreateStock(tx, warehouseId, v.id);
        const qty = rows.find((r) => r.sku === v.sku)?.quantity || 0;
        if (qty > 0) {
          await this.inventory.receiveIn({
            tx,
            warehouseId,
            variantId: v.id,
            quantity: qty,
            actorId,
            reason: 'product_create',
            notes: 'مخزون ابتدائي عند إضافة اللون/المقاس',
          });
        }
      }
    });
  }

  private async ensureColorImage(productId: string, color: string, url: string) {
    const existing = await this.prisma.productImage.findFirst({
      where: { productId, color },
    });
    if (existing) {
      await this.prisma.productImage.update({
        where: { id: existing.id },
        data: { url, alt: color },
      });
    } else {
      const count = await this.prisma.productImage.count({ where: { productId } });
      await this.prisma.productImage.create({
        data: {
          productId,
          url,
          color,
          alt: color,
          sortOrder: count,
          isPrimary: count === 0,
        },
      });
    }
    await this.prisma.productVariant.updateMany({
      where: { productId, color },
      data: { imageUrl: url },
    });
  }

  async addImage(productId: string, url: string, isPrimary = false, color?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    const colorName = color?.trim() || undefined;
    if (colorName) {
      await this.ensureColorImage(productId, colorName, url);
      return this.prisma.productImage.findFirst({
        where: { productId, color: colorName },
      });
    }
    const count = await this.prisma.productImage.count({ where: { productId } });
    if (isPrimary || count === 0) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }
    return this.prisma.productImage.create({
      data: {
        productId,
        url,
        sortOrder: count,
        isPrimary: isPrimary || count === 0,
      },
    });
  }

  async uploadImage(
    productId: string,
    file: {
      filename?: string;
      originalname: string;
      mimetype: string;
      buffer?: Buffer;
    },
    color?: string,
  ) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.mimetype && !allowed.includes(file.mimetype)) {
      throw new BadRequestException('صيغة الصورة غير مدعومة (JPG / PNG / WEBP)');
    }
    const dir = join(process.cwd(), 'uploads', 'products');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    let url = '';
    if (file.filename) {
      url = `/uploads/products/${file.filename}`;
    } else {
      if (!file.buffer) throw new BadRequestException('اختاري صورة للرفع');
      const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
      const name = `${productId}-${Date.now()}${ext}`;
      writeFileSync(join(dir, name), file.buffer);
      url = `/uploads/products/${name}`;
    }
    return this.addImage(productId, url, false, color);
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('الصورة غير موجودة');
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true };
  }
}
