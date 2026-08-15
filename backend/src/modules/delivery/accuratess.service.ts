import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus } from '@prisma/client';

export type AccuratessAccountCreds = {
  apiToken: string;
  endpoint?: string | null;
  senderZoneId?: string | null;
  senderSubzoneId?: string | null;
};

export type AccuratessShipmentPayload = {
  orderNumber: string;
  senderName?: string;
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
  /** حساب الصفحة الفرعية — إن وُجد يتجاوز التوكن العام */
  account?: AccuratessAccountCreds | null;
};

@Injectable()
export class AccuratessService {
  private readonly logger = new Logger(AccuratessService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(account?: AccuratessAccountCreds | null) {
    if (account?.apiToken) return true;
    return Boolean(
      this.config.get<string>('ACCURATESS_ENABLED') === 'true' &&
        this.config.get<string>('ACCURATESS_TOKEN'),
    );
  }

  endpoint(account?: AccuratessAccountCreds | null) {
    return (
      account?.endpoint ||
      this.config.get<string>('ACCURATESS_ENDPOINT') ||
      'https://mayar.lg.accuratess.com:8443/graphql'
    );
  }

  private resolveToken(account?: AccuratessAccountCreds | null) {
    return account?.apiToken || this.config.get<string>('ACCURATESS_TOKEN') || '';
  }

  private async gql<T>(
    query: string,
    variables?: Record<string, unknown>,
    account?: AccuratessAccountCreds | null,
  ): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
    const token = this.resolveToken(account);
    if (!token) {
      return { errors: [{ message: 'لا يوجد مفتاح Accuratess' }] };
    }
    const res = await fetch(this.endpoint(account), {
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
   * يدعم مفتاح حساب لكل صفحة فرعية عبر payload.account
   */
  async saveShipment(payload: AccuratessShipmentPayload) {
    if (!this.isConfigured(payload.account)) {
      return {
        skipped: true,
        reason:
          'ACCURATESS غير مفعّل أو لا يوجد مفتاح للحساب — عيّن توكن الصفحة أو ACCURATESS_TOKEN',
      };
    }

    const sourceLabel = payload.sourcePageCode
      ? `${payload.sourcePage} (#${payload.sourcePageCode})`
      : payload.sourcePage;

    const input: Record<string, unknown> = {
      senderName: payload.senderName || payload.sourcePage,
      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone,
      recipientMobile: payload.recipientMobile || payload.recipientPhone,
      recipientAddress: [payload.recipientAddress, payload.area, payload.city]
        .filter(Boolean)
        .join(' - '),
      price: payload.price,
      notes: [
        payload.notes,
        `الراسل=${sourceLabel}`,
        `reference=${payload.orderNumber}`,
      ]
        .filter(Boolean)
        .join(' | '),
      description:
        payload.description ||
        `طلب ${payload.orderNumber} — الراسل: ${sourceLabel}`,
      refNumber: `PAGE:${sourceLabel}|ORD:${payload.orderNumber}`,
    };

    if (payload.deliveryFees != null) {
      input.notes = `${input.notes} | delivery_fee=${payload.deliveryFees}`;
    }

    const senderZoneId =
      payload.account?.senderZoneId ||
      this.config.get<string>('ACCURATESS_SENDER_ZONE_ID');
    const senderSubzoneId =
      payload.account?.senderSubzoneId ||
      this.config.get<string>('ACCURATESS_SENDER_SUBZONE_ID');
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
        payload.account,
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

  async getShipment(code: string, account?: AccuratessAccountCreds | null) {
    if (!this.isConfigured(account)) {
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
      }>(query, { code }, account);

      if (json.errors?.length) {
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
        }>(alt, { code }, account);
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
    if (/(fail|تعذر|undeliver|unable|not_deliver|failed)/.test(s)) return 'FAILED';
    if (/(cancel|ملغي|cancelled|canceled)/.test(s)) return 'FAILED';
    if (/(deliver|تم_التسليم|delivered|completed)/.test(s)) return 'DELIVERED';
    if (/(return|مرتجع|returned)/.test(s)) return 'RETURNED';
    if (/(transit|out|قيد|in_transit|shipping|on_way)/.test(s)) return 'IN_TRANSIT';
    if (/(pick|استلام|picked)/.test(s)) return 'PICKED_UP';
    if (/(assign|assigned|created|new|pending)/.test(s)) return 'ASSIGNED';
    return null;
  }
}
