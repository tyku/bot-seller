import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NormalizedPrompt,
  NormalizedPromptDocument,
} from './schemas/normalized-prompt.schema';

@Injectable()
export class NormalizedPromptRepository {
  constructor(
    @InjectModel(NormalizedPrompt.name)
    private readonly model: Model<NormalizedPromptDocument>,
  ) {}

  async create(data: {
    customerId: string;
    customerSettingsId: string;
    version: number;
    body: string;
  }): Promise<NormalizedPromptDocument> {
    const doc = new this.model({
      customerId: data.customerId,
      customerSettingsId: new Types.ObjectId(data.customerSettingsId),
      version: data.version,
      body: data.body,
    });
    return doc.save();
  }

  async findById(id: string): Promise<NormalizedPromptDocument | null> {
    return this.model.findById(id).exec();
  }

  async getMaxVersion(customerSettingsId: string): Promise<number> {
    const last = await this.model
      .findOne({ customerSettingsId: new Types.ObjectId(customerSettingsId) })
      .sort({ version: -1 })
      .select('version')
      .lean()
      .exec();
    return last?.version ?? 0;
  }

  async deleteByCustomerSettingsId(
    customerSettingsId: string,
  ): Promise<void> {
    await this.model
      .deleteMany({
        customerSettingsId: new Types.ObjectId(customerSettingsId),
      })
      .exec();
  }
}
