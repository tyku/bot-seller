import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

@Injectable()
export class WebhookSecretService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const passphrase = this.configService.get<string>('encryption.key')
      ?? 'dev-only-key-change-in-production';
    this.key = scryptSync(passphrase, 'bot-seller-wh', 32);
  }

  generate(): string {
    return randomBytes(32).toString('hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      encrypted.toString('base64'),
      tag.toString('base64'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivB64, encB64, tagB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const encrypted = Buffer.from(encB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
