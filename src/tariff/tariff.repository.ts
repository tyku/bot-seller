import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tariff, TariffDocument, TariffStatus } from './schemas/tariff.schema';

@Injectable()
export class TariffRepository {
  constructor(
    @InjectModel(Tariff.name) private tariffModel: Model<TariffDocument>,
  ) {}

  async findAll(): Promise<TariffDocument[]> {
    return this.tariffModel.find().sort({ price: 1 }).exec();
  }

  async findActive(): Promise<TariffDocument[]> {
    return this.tariffModel
      .find({ status: TariffStatus.ACTIVE })
      .sort({ price: 1 })
      .exec();
  }

  async findById(id: string): Promise<TariffDocument | null> {
    return this.tariffModel.findById(id).exec();
  }

  async create(data: Partial<Tariff>): Promise<TariffDocument> {
    const tariff = new this.tariffModel(data);
    return tariff.save();
  }

  async update(
    id: string,
    updateData: Partial<Tariff>,
  ): Promise<TariffDocument | null> {
    return this.tariffModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }
}
