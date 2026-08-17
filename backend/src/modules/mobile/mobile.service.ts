import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientPlatform, PushProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  compareSemver,
  parseClientPlatform,
} from '../../common/client-context';
import { RegisterDeviceDto } from './dto/mobile.dto';

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async bootstrap(platform?: string, version?: string) {
    const map = await this.settingsMap([
      'app.name',
      'app.locale',
      'app.currency',
      'app.currency_symbol',
      'app.timezone',
      'company.city',
      'company.country',
      'company.phone_primary',
      'company.phone_secondary',
      'company.address',
      'store.delivery_fee_tripoli',
      'store.delivery_fee_external',
      'store.url',
      'mobile.android_package',
      'mobile.ios_bundle_id',
      'mobile.ios_team_id',
      'mobile.android_min_version',
      'mobile.ios_min_version',
      'mobile.android_latest_version',
      'mobile.ios_latest_version',
      'mobile.android_force_update',
      'mobile.ios_force_update',
      'mobile.play_store_url',
      'mobile.app_store_url',
      'mobile.deep_link_scheme',
      'mobile.universal_link_host',
      'mobile.maintenance',
      'mobile.maintenance_message',
    ]);

    const client = platform ? parseClientPlatform(platform) : undefined;
    const android = this.appRelease('android', map);
    const ios = this.appRelease('ios', map);
    const current = client === ClientPlatform.IOS ? ios : android;

    let update: {
      needsUpdate: boolean;
      forceUpdate: boolean;
      storeUrl: string;
      latestVersion: string;
      minVersion: string;
    } | null = null;

    if (client && version && (client === ClientPlatform.ANDROID || client === ClientPlatform.IOS)) {
      const needsUpdate = compareSemver(version, current.latestVersion) < 0;
      const belowMin = compareSemver(version, current.minVersion) < 0;
      update = {
        needsUpdate: needsUpdate || belowMin || current.forceUpdate,
        forceUpdate: belowMin || current.forceUpdate,
        storeUrl: current.storeUrl,
        latestVersion: current.latestVersion,
        minVersion: current.minVersion,
      };
    }

    const scheme =
      map['mobile.deep_link_scheme'] ||
      this.config.get<string>('MOBILE_DEEP_LINK_SCHEME') ||
      'daronotha';
    const host =
      map['mobile.universal_link_host'] ||
      this.config.get<string>('MOBILE_UNIVERSAL_LINK_HOST') ||
      'dar-alunotha.ly';
    const apiUrl = (this.config.get<string>('APP_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const storeUrl = (
      map['store.url'] ||
      this.config.get<string>('STORE_URL') ||
      'http://localhost:5174'
    ).replace(/\/$/, '');

    return {
      api: {
        version: 'v1',
        baseUrl: `${apiUrl}/api/v1`,
        docsUrl: `${apiUrl}/docs`,
      },
      company: {
        name: map['app.name'] || 'دار الأنوثة',
        nameEn: 'Dar Al-Onotha',
        city: map['company.city'] || 'طرابلس',
        country: map['company.country'] || 'ليبيا',
        phones: [
          map['company.phone_primary'] || '0911820999',
          map['company.phone_secondary'] || '0924443839',
        ],
        address: map['company.address'] || 'طرابلس - ليبيا',
        timezone: map['app.timezone'] || 'Africa/Tripoli',
      },
      locale: map['app.locale'] || 'ar',
      rtl: true,
      currency: map['app.currency'] || 'LYD',
      currencySymbol: map['app.currency_symbol'] || 'د.ل',
      deliveryFeeTripoli: Number(map['store.delivery_fee_tripoli'] || 15),
      deliveryFeeExternal: Number(map['store.delivery_fee_external'] || 35),
      storeUrl,
      maintenance: {
        enabled: map['mobile.maintenance'] === 'true',
        messageAr: map['mobile.maintenance_message'] || '',
      },
      apps: { android, ios },
      update,
      features: {
        guestCheckout: true,
        promoCodes: true,
        orderTracking: true,
        pushNotifications: true,
        socialLogin: false,
      },
      deepLinks: {
        scheme,
        host,
        prefixes: [`${scheme}://`, `https://${host}`],
        routes: {
          home: '/',
          product: '/product/:id',
          catalog: '/catalog',
          cart: '/cart',
          checkout: '/checkout',
          order: '/order/:orderNumber',
          account: '/account',
          referral: '/r/:pageCode/:agentCode?',
        },
      },
    };
  }

  async registerDevice(dto: RegisterDeviceDto, userId?: string) {
    const platform = parseClientPlatform(dto.platform);
    const pushProvider = dto.pushProvider
      ? dto.pushProvider === 'APNS'
        ? PushProvider.APNS
        : PushProvider.FCM
      : dto.pushToken
        ? platform === ClientPlatform.IOS
          ? PushProvider.APNS
          : PushProvider.FCM
        : undefined;

    const device = await this.prisma.device.upsert({
      where: { deviceId: dto.deviceId },
      create: {
        deviceId: dto.deviceId,
        userId,
        platform,
        pushToken: dto.pushToken,
        pushProvider,
        appVersion: dto.appVersion,
        osVersion: dto.osVersion,
        locale: dto.locale || 'ar',
      },
      update: {
        ...(userId ? { userId } : {}),
        platform,
        pushToken: dto.pushToken,
        pushProvider,
        appVersion: dto.appVersion,
        osVersion: dto.osVersion,
        locale: dto.locale || 'ar',
        lastSeenAt: new Date(),
      },
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      platform: device.platform,
      pushRegistered: Boolean(device.pushToken),
    };
  }

  async unregisterDevice(deviceId: string, userId?: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceId } });
    if (!device) return { removed: false };
    if (userId && device.userId && device.userId !== userId) {
      return { removed: false };
    }
    await this.prisma.device.update({
      where: { deviceId },
      data: { pushToken: null, pushProvider: null, userId: userId ? null : device.userId },
    });
    return { removed: true };
  }

  appleAppSiteAssociation() {
    const bundleId =
      this.config.get<string>('MOBILE_IOS_BUNDLE_ID') || 'ly.daronotha.store';
    const teamId = this.config.get<string>('MOBILE_IOS_TEAM_ID') || '';
    const appId = teamId ? `${teamId}.${bundleId}` : bundleId;
    return {
      applinks: {
        apps: [],
        details: [
          {
            appID: appId,
            paths: [
              '/',
              '/product/*',
              '/catalog',
              '/cart',
              '/checkout',
              '/order/*',
              '/account',
              '/r/*',
            ],
          },
        ],
      },
    };
  }

  async assetLinks() {
    const packageName =
      this.config.get<string>('MOBILE_ANDROID_PACKAGE') || 'ly.daronotha.store';
    const raw =
      (
        await this.prisma.setting.findUnique({
          where: { key: 'mobile.android_sha256_fingerprints' },
        })
      )?.value || '';
    const fingerprints = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];
  }

  private appRelease(kind: 'android' | 'ios', map: Record<string, string>) {
    if (kind === 'ios') {
      return {
        platform: 'IOS' as const,
        bundleId:
          map['mobile.ios_bundle_id'] ||
          this.config.get<string>('MOBILE_IOS_BUNDLE_ID') ||
          'ly.daronotha.store',
        minVersion: map['mobile.ios_min_version'] || '1.0.0',
        latestVersion: map['mobile.ios_latest_version'] || '1.0.0',
        forceUpdate: map['mobile.ios_force_update'] === 'true',
        storeUrl: map['mobile.app_store_url'] || '',
      };
    }
    return {
      platform: 'ANDROID' as const,
      packageName:
        map['mobile.android_package'] ||
        this.config.get<string>('MOBILE_ANDROID_PACKAGE') ||
        'ly.daronotha.store',
      minVersion: map['mobile.android_min_version'] || '1.0.0',
      latestVersion: map['mobile.android_latest_version'] || '1.0.0',
      forceUpdate: map['mobile.android_force_update'] === 'true',
      storeUrl: map['mobile.play_store_url'] || '',
    };
  }

  private async settingsMap(keys: string[]) {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}
