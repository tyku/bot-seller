import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { DeduplicationService } from './services/deduplication.service';
import { SubscriptionService } from './services/subscription.service';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { TELEGRAM_INCOMING_QUEUE } from './constants';

@Module({
  imports: [
    CustomerSettingsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: TELEGRAM_INCOMING_QUEUE,
    }),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    DeduplicationService,
    SubscriptionService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class GatewayModule {}
