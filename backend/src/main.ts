import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const app = await NestFactory.create(AppModule);
configureApp(app);
await app.listen(app.get(ConfigService).get<number>('PORT') ?? 4000);
