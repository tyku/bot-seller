import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
}
