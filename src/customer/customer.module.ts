import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './customer.repository';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerRepository],
  exports: [CustomerService, CustomerRepository],
})
export class CustomerModule {}
