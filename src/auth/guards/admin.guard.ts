import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAdmin, isDevelopmentNodeEnv } from '../roles';
import type { CurrentUserData } from '../decorators/current-user.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: CurrentUserData }>();
    const user = request.user;
    const isDev = isDevelopmentNodeEnv(
      this.configService.get<string>('nodeEnv'),
    );
    if (!user || !isAdmin(user, isDev)) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
