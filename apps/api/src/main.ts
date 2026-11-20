import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './app.factory';
import { config } from './config';

async function bootstrap() {
  const app = await createApp();
  await app.listen(config.port, '0.0.0.0');
  Logger.log(`API en ${config.publicUrl}/api/v1 · documentación en ${config.publicUrl}/api/docs`, 'Portfol.io');
}
bootstrap();
