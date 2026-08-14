import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { sanitizePrices, canViewWholesalePrices, canViewCostPrices } from '../../common/pricing/price-policy';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
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
    const variants = dto.variants?.length
      ? dto.variants
      : [
          {
            sku: dto.sku || `SKU-${Date.now()}`,
            nameAr: dto.nameAr,
            retailPrice: retail,
            costPrice: pricing.costPrice,
            wholesalePrice: pricing.wholesalePrice,
          },
        ];

    const product = await this.prisma.product.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        description: dto.description,
        categoryId: dto.categoryId,
        brand: dto.brand,
        sku: dto.sku,
        retailPrice: retail,
        basePrice: retail,
        costPrice: pricing.costPrice,
        wholesalePrice: pricing.wholesalePrice,
        isTrackStock: dto.isTrackStock ?? true,
        status: 'ACTIVE',
        variants: {
          create: variants.map((v) => {
            const vRetail = v.retailPrice ?? v.price ?? retail;
            const vPricing = this.pricingFields(user, {
              costPrice: v.costPrice ?? pricing.costPrice,
              wholesalePrice: v.wholesalePrice ?? pricing.wholesalePrice,
            });
            return {
              sku: v.sku,
              barcode: v.barcode,
              nameAr: v.nameAr,
              color: v.color,
              size: v.size,
              retailPrice: vRetail,
              price: vRetail,
              costPrice: vPricing.costPrice,
              wholesalePrice: vPricing.wholesalePrice,
            };
          }),
        },
      },
      include: { variants: true, images: true },
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
}
