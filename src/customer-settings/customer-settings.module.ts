import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSettingsController } from './customer-settings.controller';
import { CustomerSettingsService } from './customer-settings.service';
import { CustomerSettingsRepository } from './customer-settings.repository';
import {
  CustomerSettings,
  CustomerSettingsSchema,
} from './schemas/customer-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerSettings.name, schema: CustomerSettingsSchema },
    ]),
  ],
  controllers: [CustomerSettingsController],
  providers: [CustomerSettingsService, CustomerSettingsRepository],
  exports: [CustomerSettingsService, CustomerSettingsRepository],
})
export class CustomerSettingsModule {}
