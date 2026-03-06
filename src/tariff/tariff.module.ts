import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TariffController } from './tariff.controller';
import { TariffService } from './tariff.service';
import { TariffRepository } from './tariff.repository';
import { Tariff, TariffSchema } from './schemas/tariff.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tariff.name, schema: TariffSchema }]),
  ],
  controllers: [TariffController],
  providers: [TariffService, TariffRepository],
  exports: [TariffService, TariffRepository],
})
export class TariffModule {}
