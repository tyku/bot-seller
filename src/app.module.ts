import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { CustomerModule } from './customer/customer.module';
import { CustomerSettingsModule } from './customer-settings/customer-settings.module';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';
import { TelegramModule } from './telegram/telegram.module';
import { UserModule } from './user/user.module';
import { GatewayModule } from './gateway/gateway.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
    }),
    CustomerModule,
    CustomerSettingsModule,
    AuthModule,
    VerificationModule,
    TelegramModule,
    UserModule,
    GatewayModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
