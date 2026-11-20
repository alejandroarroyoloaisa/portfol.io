import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { config } from './config';
import { ErrorsFilter } from './common/errors.filter';

export async function createApp(opts: { logger?: boolean } = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: opts.logger === false ? false : ['log', 'warn', 'error'] });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, credentials: true });
  app.setGlobalPrefix('api/v1', { exclude: ['media/{*path}'] });
  app.useGlobalFilters(new ErrorsFilter());
  app.enableShutdownHooks();
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Portfol.io API').setDescription('API REST de Portfol.io (prefijo /api/v1)').setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);
  return app;
}
