import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export type PushPayload = {
  titleAr: string;
  bodyAr?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, string>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sendToUsers(userIds: string[], payload: PushPayload) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return { queued: 0 };

    const devices = await this.prisma.device.findMany({
      where: {
        userId: { in: unique },
        pushToken: { not: null },
      },
      select: { id: true, platform: true, pushProvider: true, pushToken: true },
    });

    const fcmEnabled = this.config.get<string>('FCM_ENABLED') === 'true';
    const apnsEnabled = this.config.get<string>('APNS_ENABLED') === 'true';

    if (!devices.length) return { queued: 0 };

    if (!fcmEnabled && !apnsEnabled) {
      this.logger.debug(
        `Push ready for ${devices.length} device(s) — FCM/APNs not enabled yet (${payload.titleAr})`,
      );
      return { queued: devices.length };
    }

    // Future: send via FCM HTTP v1 / APNs when credentials are configured.
    this.logger.log(`Would send push to ${devices.length} device(s): ${payload.titleAr}`);
    return { queued: devices.length };
  }
}
