import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomerService } from '../../customer/customer.service';
import { CustomerStatus } from '../../customer/schemas/customer.schema';

export interface JwtPayload {
  sub: string; // customer _id
  customerId: number; // business customerId
  email?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private customerService: CustomerService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    let customer;
    try {
      customer = await this.customerService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('Customer not found');
    }

    if (customer.status !== CustomerStatus.VERIFIED) {
      throw new UnauthorizedException('Customer not verified');
    }

    return {
      _id: customer.id,
      customerId: customer.customerId,
      email: customer.email,
      role: customer.role,
    };
  }
}
