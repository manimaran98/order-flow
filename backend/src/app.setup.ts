import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Global app configuration shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: app.get(ConfigService).get<string>('CORS_ORIGIN') ?? 'http://localhost:3000' });
  app.enableShutdownHooks();
}
