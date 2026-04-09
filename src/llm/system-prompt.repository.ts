import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SystemPrompt,
  SystemPromptDocument,
  SystemPromptType,
} from './schemas/system-prompt.schema';

@Injectable()
export class SystemPromptRepository {
  constructor(
    @InjectModel(SystemPrompt.name)
    private systemPromptModel: Model<SystemPromptDocument>,
  ) {}

  async findByType(type: SystemPromptType): Promise<SystemPromptDocument[]> {
    return this.systemPromptModel.find({ type }).sort({ createdAt: 1 }).exec();
  }

  async findAll(): Promise<SystemPromptDocument[]> {
    return this.systemPromptModel.find().sort({ type: 1, name: 1 }).exec();
  }

  async updateText(
    id: string,
    text: string,
  ): Promise<SystemPromptDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.systemPromptModel
      .findByIdAndUpdate(id, { $set: { text } }, { new: true })
      .exec();
  }
}
