import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  onboardingSchema, OnboardingInput, pushTokenSchema, settingsSchema, SettingsInput, statsPeriodSchema, updateMeSchema,
  UpdateMeInput,
} from '@portfolio/schemas';
import { z } from 'zod';
import { AuthUser, CurrentUser, OptionalUser, Public } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { ApplicationsService } from '../calls/applications.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private users: UsersService, private prisma: PrismaService, private apps: ApplicationsService) {}

  @Get()
  get(@CurrentUser() u: AuthUser) {
    return this.users.me(u.id);
  }

  @Patch()
  update(@CurrentUser() u: AuthUser, @Body(new ZodPipe(updateMeSchema)) b: UpdateMeInput) {
    return this.users.update(u.id, b);
  }

  @Post('onboarding')
  @HttpCode(200)
  onboarding(@CurrentUser() u: AuthUser, @Body(new ZodPipe(onboardingSchema)) b: OnboardingInput) {
    return this.users.onboarding(u.id, b);
  }

  @Patch('settings')
  settings(@CurrentUser() u: AuthUser, @Body(new ZodPipe(settingsSchema)) b: SettingsInput) {
    return this.users.settings(u.id, b);
  }

  @Get('summary')
  summary(@CurrentUser() u: AuthUser) {
    return this.users.summary(u.id);
  }

  @Get('stats')
  stats(@CurrentUser() u: AuthUser, @Query(new ZodPipe(statsPeriodSchema)) q: { period: '7d' | '30d' | '90d' }) {
    return this.users.stats(u.id, q.period);
  }

  @Get('artworks')
  artworks(@CurrentUser() u: AuthUser, @Query('drafts') drafts?: string) {
    return this.users.artworks(u.id, u.id, { drafts: drafts === 'true' });
  }

  @Get('series')
  series(@CurrentUser() u: AuthUser) {
    return this.users.series(u.id);
  }

  @Get('saved')
  saved(@CurrentUser() u: AuthUser) {
    return this.users.saved(u.id);
  }

  @Get('applications')
  applications(@CurrentUser() u: AuthUser, @Query('filter') filter?: 'todas' | 'en_curso' | 'resueltas') {
    return this.apps.mine(u.id, filter ?? 'todas');
  }

  @Get('export')
  export(@CurrentUser() u: AuthUser) {
    return this.users.export(u.id);
  }

  @Delete()
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser) {
    return this.users.remove(u.id);
  }

  @Post('push-tokens')
  @HttpCode(204)
  async pushToken(@CurrentUser() u: AuthUser, @Body(new ZodPipe(pushTokenSchema)) b: { token: string; platform: string }) {
    await this.prisma.pushToken.upsert({ where: { token: b.token }, create: { ...b, userId: u.id }, update: { userId: u.id } });
  }
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Public()
  @Get(':handle')
  get(@Param('handle') handle: string, @OptionalUser() u?: AuthUser) {
    return this.users.profileByHandle(handle, u?.id);
  }

  @Public()
  @Get(':id/artworks')
  artworks(@Param('id') id: string, @OptionalUser() u?: AuthUser, @Query('seriesId') seriesId?: string) {
    return this.users.artworks(id, u?.id, { seriesId });
  }

  @Public()
  @Get(':id/series')
  series(@Param('id') id: string) {
    return this.users.series(id);
  }

  @Public()
  @Post(':id/view')
  @HttpCode(204)
  view(@Param('id') id: string, @OptionalUser() u?: AuthUser) {
    return this.users.recordView(id, u);
  }

  @Post(':id/follow')
  @HttpCode(204)
  follow(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.users.follow(u.id, id);
  }

  @Delete(':id/follow')
  @HttpCode(204)
  unfollow(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.users.unfollow(u.id, id);
  }

  @Post(':id/endorsements')
  @HttpCode(204)
  endorse(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(new ZodPipe(z.object({ technique: z.string() }))) b: { technique: string }) {
    return this.users.endorse(u.id, id, b.technique);
  }
}
