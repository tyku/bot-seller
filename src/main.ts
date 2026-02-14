import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable global exception filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
