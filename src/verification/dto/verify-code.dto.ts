import { z } from 'zod';
import { VerificationType } from '../schemas/verification.schema';

export const VerifyCodeSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10).max(15).optional(),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  type: z.nativeEnum(VerificationType),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone must be provided',
  },
);

export type VerifyCodeDto = z.infer<typeof VerifyCodeSchema>;
