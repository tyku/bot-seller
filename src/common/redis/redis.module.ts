import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const opts: RedisOptions = {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: 3,
        };
        const user = configService.get<string>('redis.user');
        if (user) opts.username = user;
        return new Redis(opts);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
