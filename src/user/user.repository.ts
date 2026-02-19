import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, SourceType } from './schemas/user.schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByExternalId(
    sourceType: SourceType,
    externalId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ sourceType, externalId }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async update(
    id: string,
    updateData: UpdateUserDto,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async upsertByExternalId(
    sourceType: SourceType,
    externalId: string,
    data: Partial<User>,
  ): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { sourceType, externalId },
        { $set: { ...data, sourceType, externalId } },
        { new: true, upsert: true },
      )
      .exec();
  }
}
