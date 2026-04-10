import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CustomerSettingsModule } from '../customer-settings/customer-settings.module';
import { VK_INCOMING_QUEUE } from '../gateway/constants';
import { VkService } from './vk.service';

@Module({
  imports: [
    CustomerSettingsModule,
    BullModule.registerQueue({ name: VK_INCOMING_QUEUE }),
  ],
  providers: [VkService],
  exports: [VkService],
})
export class VkModule {}

