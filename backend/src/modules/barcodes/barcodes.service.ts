import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeSequenceService } from '../inventory/services/code-sequence.service';

@Injectable()
export class BarcodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeSequenceService,
  ) {}

  async generateVariantBarcode(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('المتغير غير موجود');
    if (variant.barcode) {
      return {
        variantId,
        barcode: variant.barcode,
        generated: false,
        label: this.labelForVariant(variant),
      };
    }

    const seq = await this.codes.nextCode('variant_barcode', 100000);
    const barcode = this.codes.variantBarcodeFromParts(variant.sku, seq);
    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { barcode },
      include: { product: true },
    });

    return {
      variantId,
      barcode: updated.barcode,
      generated: true,
      label: this.labelForVariant(updated),
    };
  }

  async generateMissing() {
    const variants = await this.prisma.productVariant.findMany({
      where: { OR: [{ barcode: null }, { barcode: '' }] },
      include: { product: true },
      take: 200,
    });
    const results = [];
    for (const v of variants) {
      results.push(await this.generateVariantBarcode(v.id));
    }
    return { count: results.length, items: results };
  }

  async printPayload(variantIds: string[]) {
    if (!variantIds?.length) throw new BadRequestException('حدد منتجات للطباعة');
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const labels = [];
    for (const v of variants) {
      let barcode = v.barcode;
      if (!barcode) {
        const gen = await this.generateVariantBarcode(v.id);
        barcode = gen.barcode!;
      }
      labels.push({
        barcode,
        sku: v.sku,
        productName: v.product.nameAr,
        color: v.color,
        size: v.size,
        retailPrice: Number(v.retailPrice || v.price),
        label: this.labelForVariant({ ...v, barcode }),
      });
    }
    return { labels, printFormat: '30x20mm' };
  }

  async orderBarcode(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      barcode: order.orderBarcode,
      label: {
        title: order.orderNumber,
        barcode: order.orderBarcode,
        customer: order.shippingName,
        phone: order.shippingPhone,
      },
    };
  }

  /** بحث صنف بالباركود أو SKU لنقطة البيع */
  async lookupVariant(code: string) {
    const normalized = code.trim();
    if (!normalized) throw new BadRequestException('أدخل الباركود');

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        isActive: true,
        OR: [
          { barcode: normalized },
          { barcode: normalized.toUpperCase() },
          { sku: normalized },
          { sku: normalized.toUpperCase() },
        ],
      },
      include: { product: true },
    });

    if (!variant || variant.product.status !== 'ACTIVE') {
      throw new NotFoundException(`لم يُعثر على صنف للباركود: ${normalized}`);
    }

    const retail = Number(variant.retailPrice || variant.price || 0);
    const wholesale = Number(variant.wholesalePrice ?? retail);

    return {
      variantId: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      productName: variant.product.nameAr,
      variantName:
        variant.nameAr ||
        [variant.color, variant.size].filter(Boolean).join(' / ') ||
        null,
      color: variant.color,
      size: variant.size,
      retailPrice: retail,
      wholesalePrice: wholesale,
      label: this.labelForVariant(variant),
    };
  }

  private labelForVariant(v: {
    barcode?: string | null;
    sku: string;
    color?: string | null;
    size?: string | null;
    product?: { nameAr: string };
    retailPrice?: unknown;
    price?: unknown;
  }) {
    return {
      title: v.product?.nameAr || v.sku,
      subtitle: [v.color, v.size].filter(Boolean).join(' / '),
      sku: v.sku,
      barcode: v.barcode,
      price: Number(v.retailPrice ?? v.price ?? 0),
    };
  }
}
