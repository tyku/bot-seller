import { SourceType } from '../schemas/user.schema';

export class ResponseUserDto {
  id: string;
  sourceType: SourceType;
  externalId: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}
