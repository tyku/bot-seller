import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/bot-seller',
    ),
    CustomerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
