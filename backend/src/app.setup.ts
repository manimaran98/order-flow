import './common/money.js'; // installs Decimal JSON serialization
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';

/** Global app configuration shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableCors({ origin: app.get(ConfigService).get<string>('CORS_ORIGIN') ?? 'http://localhost:3000' });
  app.enableShutdownHooks();
}
