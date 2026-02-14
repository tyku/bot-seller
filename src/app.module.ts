import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerModule } from './customer/customer.module';
import { CustomerSettingsModule } from './customer-settings/customer-settings.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/bot-seller',
    ),
    CustomerModule,
    CustomerSettingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
