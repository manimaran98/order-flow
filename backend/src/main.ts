import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const app = await NestFactory.create(AppModule);
configureApp(app);

const openApi = new DocumentBuilder()
  .setTitle('OrderFlow API')
  .setDescription('Order-to-payment tracking for Malaysian SMEs')
  .setVersion('0.1.0')
  .addBearerAuth()
  .addSecurityRequirements('bearer')
  .build();
SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi));

await app.listen(app.get(ConfigService).get<number>('PORT') ?? 4000);
