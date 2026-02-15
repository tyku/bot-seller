import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomerService } from '../../customer/customer.service';

export interface JwtPayload {
  sub: string; // customer _id
  customerId: number; // business customerId
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private customerService: CustomerService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const customer = await this.customerService.findById(payload.sub);
    
    if (!customer) {
      throw new UnauthorizedException('Customer not found');
    }

    // Check if customer is verified
    if (customer.status !== 'verified') {
      throw new UnauthorizedException('Customer not verified');
    }

    return {
      _id: payload.sub,
      customerId: payload.customerId,
      email: payload.email,
    };
  }
}
