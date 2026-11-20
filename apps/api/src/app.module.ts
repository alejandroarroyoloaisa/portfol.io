import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { config } from './config';
import { PrismaModule } from './prisma/prisma.service';
import { JwtAuthGuard } from './common/auth';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MeController, UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { ArtworksController } from './artworks/artworks.controller';
import { ArtworksService } from './artworks/artworks.service';
import { UploadsController } from './uploads/uploads.controller';
import { StorageService } from './uploads/storage.service';
import { FeedController } from './feed/feed.controller';
import { FeedService } from './feed/feed.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { NetworkController } from './network/network.controller';
import { NetworkService } from './network/network.service';
import { CallsController } from './calls/calls.controller';
import { CallsService } from './calls/calls.service';
import { ApplicationsService } from './calls/applications.service';
import { MessagingController } from './messaging/messaging.controller';
import { MessagingService } from './messaging/messaging.service';
import { MessagingGateway } from './messaging/messaging.gateway';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { RealtimeService } from './notifications/realtime.service';
import { ReportsController } from './reports/reports.controller';
import { HealthController } from './health.controller';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: config.jwtSecret }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 300 }], skipIf: () => process.env.NODE_ENV === 'test' }),
    // Imágenes públicas (solo variantes WebP; los documentos van por URL firmada)
    ServeStaticModule.forRoot({
      rootPath: join(config.uploadDir, 'public'),
      serveRoot: '/media',
      serveStaticOptions: { index: false, maxAge: '30d', immutable: true },
    }),
  ],
  controllers: [
    HealthController, AuthController, MeController, UsersController, ArtworksController, UploadsController, FeedController,
    SearchController, NetworkController, CallsController, MessagingController, NotificationsController, ReportsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    AuthService, UsersService, ArtworksService, StorageService, FeedService, SearchService, NetworkService, CallsService,
    ApplicationsService, MessagingService, MessagingGateway, NotificationsService, RealtimeService,
  ],
  exports: [JwtModule],
})
export class AppModule {}
