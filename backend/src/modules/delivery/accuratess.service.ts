import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus } from '@prisma/client';

export type AccuratessShipmentPayload = {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientMobile?: string;
  recipientAddress: string;
  city?: string | null;
  area?: string | null;
  notes?: string | null;
  price: number;
  deliveryFees?: number;
  sourcePage: string;
  sourcePageCode?: number | null;
  description?: string;
};

@Injectable()
export class AccuratessService {
  private readonly logger = new Logger(AccuratessService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get<string>('ACCURATESS_ENABLED') === 'true' &&
        this.config.get<string>('ACCURATESS_TOKEN'),
    );
  }

  endpoint() {
    return (
      this.config.get<string>('ACCURATESS_ENDPOINT') ||
      'https://mayar.lg.accuratess.com:8443/graphql'
    );
  }

  private async gql<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    const token = this.config.get<string>('ACCURATESS_TOKEN')!;
    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    return (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  }

  /**
   * يرسل الشحنة إلى Accuratess GraphQL (saveShipment)
   * مرجع الصفحة يُمرَّر عبر refNumber + notes
   */
  async saveShipment(payload: AccuratessShipmentPayload) {
    if (!this.isConfigured()) {
      return {
        skipped: true,
        reason: 'ACCURATESS غير مفعّل — عيّن ACCURATESS_ENABLED=true و ACCURATESS_TOKEN',
      };
    }

    const sourceLabel = payload.sourcePageCode
      ? `${payload.sourcePage} (#${payload.sourcePageCode})`
      : payload.sourcePage;

    const input: Record<string, unknown> = {
      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone,
      recipientMobile: payload.recipientMobile || payload.recipientPhone,
      recipientAddress: [payload.recipientAddress, payload.area, payload.city]
        .filter(Boolean)
        .join(' - '),
      price: payload.price,
      notes: [
        payload.notes,
        `source_page=${sourceLabel}`,
        `reference=${payload.orderNumber}`,
      ]
        .filter(Boolean)
        .join(' | '),
      description:
        payload.description ||
        `طلب ${payload.orderNumber} — مصدر الصفحة: ${sourceLabel}`,
      refNumber: `PAGE:${sourceLabel}|ORD:${payload.orderNumber}`,
    };

    if (payload.deliveryFees != null) {
      input.notes = `${input.notes} | delivery_fee=${payload.deliveryFees}`;
    }

    const senderZoneId = this.config.get<string>('ACCURATESS_SENDER_ZONE_ID');
    const senderSubzoneId = this.config.get<string>('ACCURATESS_SENDER_SUBZONE_ID');
    const recipientZoneId = this.config.get<string>('ACCURATESS_DEFAULT_RECIPIENT_ZONE_ID');
    const recipientSubzoneId = this.config.get<string>(
      'ACCURATESS_DEFAULT_RECIPIENT_SUBZONE_ID',
    );
    if (senderZoneId) input.senderZoneId = Number(senderZoneId);
    if (senderSubzoneId) input.senderSubzoneId = Number(senderSubzoneId);
    if (recipientZoneId) input.recipientZoneId = Number(recipientZoneId);
    if (recipientSubzoneId) input.recipientSubzoneId = Number(recipientSubzoneId);

    const query = `
      mutation SaveShipment($input: ShipmentInput!) {
        saveShipment(input: $input) {
          id
          code
          trackingUrl
          refNumber
          notes
          description
          status
        }
      }
    `;

    try {
      const json = await this.gql<{ saveShipment?: Record<string, unknown> }>(
        query,
        { input },
      );

      if (json.errors?.length) {
        const msg = json.errors.map((e) => e.message).join('; ');
        this.logger.error(`Accuratess saveShipment failed: ${msg}`);
        return { ok: false, error: msg, raw: json };
      }

      return { ok: true, shipment: json.data?.saveShipment, raw: json };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Accuratess network error';
      this.logger.error(message);
      return { ok: false, error: message };
    }
  }

  /** جلب حالة شحنة Accuratess بالكود */
  async getShipment(code: string) {
    if (!this.isConfigured()) {
      return {
        skipped: true,
        reason: 'ACCURATESS غير مفعّل',
      };
    }

    const query = `
      query Shipment($code: String!) {
        shipment(code: $code) {
          id
          code
          status
          trackingUrl
          refNumber
          notes
        }
      }
    `;

    try {
      const json = await this.gql<{
        shipment?: {
          id?: string;
          code?: string;
          status?: string;
          trackingUrl?: string;
          refNumber?: string;
          notes?: string;
        };
      }>(query, { code });

      if (json.errors?.length) {
        // fallback: findShipments
        const alt = `
          query Find($code: String!) {
            findShipments(input: { code: $code }) {
              id
              code
              status
              trackingUrl
              refNumber
              notes
            }
          }
        `;
        const altJson = await this.gql<{
          findShipments?: Array<{
            id?: string;
            code?: string;
            status?: string;
            trackingUrl?: string;
          }>;
        }>(alt, { code });
        if (altJson.errors?.length) {
          return {
            ok: false,
            error: json.errors.map((e) => e.message).join('; '),
          };
        }
        const shipment = altJson.data?.findShipments?.[0];
        return { ok: true, shipment };
      }

      return { ok: true, shipment: json.data?.shipment };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Accuratess network error';
      return { ok: false, error: message };
    }
  }

  mapRemoteStatus(remote?: string | null): DeliveryStatus | null {
    if (!remote) return null;
    const s = remote.toString().toLowerCase().replace(/\s+/g, '_');
    if (/(deliver|تم_التسليم|delivered|completed)/.test(s)) return 'DELIVERED';
    if (/(cancel|ملغي|cancelled|canceled)/.test(s)) return 'FAILED';
    if (/(return|مرتجع|returned)/.test(s)) return 'RETURNED';
    if (/(transit|out|قيد|in_transit|shipping|on_way)/.test(s)) return 'IN_TRANSIT';
    if (/(pick|استلام|picked)/.test(s)) return 'PICKED_UP';
    if (/(assign|assigned|created|new|pending)/.test(s)) return 'ASSIGNED';
    return null;
  }
}
