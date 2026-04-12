import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS
  const isDev = false; //configService.get<string>('nodeEnv') !== 'production';
  app.enableCors({
    origin: isDev ? true : ['http://localhost:3000', 'https://test-it.tech'], // TODO: replace with production domain
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders:
      'Content-Type,Authorization,Accept,X-Demo-Draft-Id,X-Demo-Draft-Secret',
  });
  
  // Enable global exception filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  
  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
}
bootstrap();
