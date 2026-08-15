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
          },
        ];

    const variantRows = [];
    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      const vRetail = v.retailPrice ?? v.price ?? retail;
      const vPricing = this.pricingFields(user, {
        costPrice: v.costPrice ?? pricing.costPrice,
        wholesalePrice: v.wholesalePrice ?? pricing.wholesalePrice,
      });
      const suffix = [v.size, v.color].filter(Boolean).join('-');
      const sku =
        v.sku?.trim() ||
        (variants.length === 1
          ? baseSku
          : `${baseSku}${suffix ? `-${suffix}` : `-${i + 1}`}`);
      const barcode =
        v.barcode ||
        this.codes.variantBarcodeFromParts(
          sku,
          await this.codes.nextCode('variant_barcode', 100000),
        );
      variantRows.push({
        sku,
        barcode,
        nameAr: v.nameAr,
        color: v.color,
        size: v.size,
        retailPrice: vRetail,
        price: vRetail,
        costPrice: vPricing.costPrice,
        wholesalePrice: vPricing.wholesalePrice,
      });
    }

    const imageUrls = (dto.imageUrls || []).map((u) => u.trim()).filter(Boolean);

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
        variants: { create: variantRows },
        images: imageUrls.length
          ? {
              create: imageUrls.map((url, idx) => ({
                url,
                sortOrder: idx,
                isPrimary: idx === 0,
              })),
            }
          : undefined,
      },
      include: { variants: true, images: true, category: true },
    });

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
    const sku =
      dto.sku ||
      (await this.codes.nextSku()) +
        ([dto.size, dto.color].filter(Boolean).length
          ? `-${[dto.size, dto.color].filter(Boolean).join('-')}`
          : '');
    const barcode =
      dto.barcode ||
      this.codes.variantBarcodeFromParts(
        sku,
        await this.codes.nextCode('variant_barcode', 100000),
      );

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku,
        barcode,
        nameAr: dto.nameAr,
        color: dto.color,
        size: dto.size,
        retailPrice: retail,
        price: retail,
        costPrice: pricing.costPrice,
        wholesalePrice: pricing.wholesalePrice,
      },
    });
    return sanitizePrices(variant, user);
  }

  async addImage(productId: string, url: string, isPrimary = false) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('المنتج غير موجود');
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
  ) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.mimetype && !allowed.includes(file.mimetype)) {
      throw new BadRequestException('صيغة الصورة غير مدعومة (JPG / PNG / WEBP)');
    }
    const dir = join(process.cwd(), 'uploads', 'products');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (file.filename) {
      return this.addImage(productId, `/uploads/products/${file.filename}`, false);
    }
    if (!file.buffer) throw new BadRequestException('اختاري صورة للرفع');
    const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
    const name = `${productId}-${Date.now()}${ext}`;
    writeFileSync(join(dir, name), file.buffer);
    return this.addImage(productId, `/uploads/products/${name}`, false);
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
