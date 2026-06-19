import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? frontendUrl : true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
