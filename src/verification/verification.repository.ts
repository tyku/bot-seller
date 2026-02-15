import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Verification, VerificationDocument, VerificationType, VerificationStatus } from './schemas/verification.schema';

@Injectable()
export class VerificationRepository {
  constructor(
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
  ) {}

  async create(data: {
    customerId: string | Types.ObjectId;
    type: VerificationType;
    code: string;
    expiresAt: Date;
    contact: string;
  }): Promise<VerificationDocument> {
    const verification = new this.verificationModel({
      ...data,
      customerId: new Types.ObjectId(data.customerId),
      status: VerificationStatus.PENDING,
      attempts: 0,
    });
    return verification.save();
  }

  async findActiveByCustomerAndType(
    customerId: string | Types.ObjectId,
    type: VerificationType,
  ): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findOne({
        customerId: customerId as any,
        type,
        status: VerificationStatus.PENDING,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findActiveByContact(
    contact: string,
    type: VerificationType,
  ): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findOne({
        contact,
        type,
        status: VerificationStatus.PENDING,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<VerificationDocument | null> {
    return this.verificationModel.findById(id).exec();
  }

  async markAsVerified(id: string): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findByIdAndUpdate(
        id,
        {
          status: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async markAsFailed(id: string): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findByIdAndUpdate(
        id,
        {
          status: VerificationStatus.FAILED,
        },
        { new: true },
      )
      .exec();
  }

  async incrementAttempts(id: string): Promise<VerificationDocument | null> {
    return this.verificationModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { attempts: 1 },
        },
        { new: true },
      )
      .exec();
  }

  async expireOldVerifications(): Promise<void> {
    await this.verificationModel
      .updateMany(
        {
          status: VerificationStatus.PENDING,
          expiresAt: { $lt: new Date() },
        },
        {
          status: VerificationStatus.EXPIRED,
        },
      )
      .exec();
  }

  async findAllByCustomer(customerId: string | Types.ObjectId): Promise<VerificationDocument[]> {
    return this.verificationModel
      .find({
        customerId: customerId as any,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteOldVerifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.verificationModel
      .deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: [VerificationStatus.VERIFIED, VerificationStatus.EXPIRED, VerificationStatus.FAILED] },
      })
      .exec();
  }

  async invalidateAllByCustomerAndType(
    customerId: string | Types.ObjectId,
    type: VerificationType,
  ): Promise<void> {
    await this.verificationModel
      .updateMany(
        {
          customerId: customerId as any,
          type,
          status: VerificationStatus.PENDING,
        },
        {
          status: VerificationStatus.EXPIRED,
        },
      )
      .exec();
  }
}
