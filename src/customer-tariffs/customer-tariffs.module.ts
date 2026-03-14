import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerTariffsService } from './customer-tariffs.service';
import { CustomerTariffsRepository } from './customer-tariffs.repository';
import {
  CustomerTariff,
  CustomerTariffSchema,
} from './schemas/customer-tariff.schema';
import { TariffModule } from '../tariff/tariff.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerTariff.name, schema: CustomerTariffSchema },
    ]),
    TariffModule,
  ],
  providers: [CustomerTariffsService, CustomerTariffsRepository],
  exports: [CustomerTariffsService, CustomerTariffsRepository],
})
export class CustomerTariffsModule {}
