import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CustomerSettingsDraft,
  CustomerSettingsDraftDocument,
} from './schemas/customer-settings-draft.schema';
import { BotType } from '../customer-settings/schemas/customer-settings.schema';

@Injectable()
export class DemoDraftRepository {
  constructor(
    @InjectModel(CustomerSettingsDraft.name)
    private readonly model: Model<CustomerSettingsDraftDocument>,
  ) {}

  async create(data: {
    draftId: string;
    secretHash: string;
    name: string;
    botType: BotType;
    prompts: Array<{ name: string; body: string; type: 'context' }>;
    businessDescription?: string;
    normalizedPrompt?: string;
    expiresAt: Date;
  }): Promise<CustomerSettingsDraftDocument> {
    const doc = new this.model(data);
    return doc.save();
  }

  async findByDraftId(
    draftId: string,
  ): Promise<CustomerSettingsDraftDocument | null> {
    return this.model.findOne({ draftId }).exec();
  }

  async updateByDraftId(
    draftId: string,
    update: Partial<{
      name: string;
      botType: BotType;
      prompts: Array<{ name: string; body: string; type: 'context' }>;
      businessDescription: string | undefined;
      normalizedPrompt: string | undefined;
      expiresAt: Date;
    }>,
  ): Promise<CustomerSettingsDraftDocument | null> {
    return this.model
      .findOneAndUpdate({ draftId }, update, { new: true })
      .exec();
  }

  async deleteByDraftId(draftId: string): Promise<void> {
    await this.model.deleteOne({ draftId }).exec();
  }
}
