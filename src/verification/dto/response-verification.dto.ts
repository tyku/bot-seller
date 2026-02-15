import { VerificationType, VerificationStatus } from '../schemas/verification.schema';

export class ResponseVerificationDto {
  id: string;
  customerId: string;
  type: VerificationType;
  status: VerificationStatus;
  contact: string;
  expiresAt: Date;
  verifiedAt?: Date;
  attempts: number;
  createdAt: Date;

  constructor(partial: Partial<ResponseVerificationDto>) {
    Object.assign(this, partial);
  }
}
