import { z } from 'zod';
import { VerificationType } from '../schemas/verification.schema';

export const SendVerificationSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10).max(15).optional(),
  telegramUsername: z.string().min(3).optional(),
  type: z.nativeEnum(VerificationType),
}).refine(
  (data) => {
    if (data.type === VerificationType.EMAIL && !data.email) {
      return false;
    }
    if (data.type === VerificationType.SMS && !data.phone) {
      return false;
    }
    if (data.type === VerificationType.TELEGRAM && !data.telegramUsername) {
      return false;
    }
    return true;
  },
  {
    message: 'Contact information must match verification type',
  },
);

export type SendVerificationDto = z.infer<typeof SendVerificationSchema>;
