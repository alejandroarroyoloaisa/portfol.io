import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApplicationStatus, createApplicationSchema, CreateApplicationInput, createCallSchema, CreateCallInput,
  updateApplicationStatusSchema, UpdateApplicationStatusInput, updateCallSchema, UpdateCallInput,
} from '@portfolio/schemas';
import { AuthUser, CurrentUser, OptionalUser, Public, Roles } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { ApplicationsService } from './applications.service';
import { CallsService } from './calls.service';

@ApiTags('calls')
@ApiBearerAuth()
@Controller()
export class CallsController {
  constructor(private calls: CallsService, private apps: ApplicationsService) {}

  @Public()
  @Get('calls')
  list(@OptionalUser() u: AuthUser | undefined, @Query('match') match?: string, @Query('type') type?: string, @Query('q') q?: string) {
    return this.calls.list(u?.id, { match: match === 'true', type, q });
  }

  @Public()
  @Get('calls/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() u?: AuthUser) {
    return this.calls.get(id, u?.id);
  }

  @Post('calls')
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(createCallSchema)) b: CreateCallInput) {
    return this.calls.create(u.id, b);
  }

  @Patch('calls/:id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateCallSchema)) b: UpdateCallInput) {
    return this.calls.update(id, u.id, b);
  }

  @Roles('artista')
  @Post('calls/:id/applications')
  apply(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(createApplicationSchema)) b: CreateApplicationInput) {
    return this.apps.apply(id, u.id, b);
  }

  @Get('calls/:id/applications')
  forCall(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('status') status?: ApplicationStatus, @Query('q') q?: string) {
    return this.apps.forCall(id, u.id, { status, q });
  }

  @Get('calls/:id/applications/:aid')
  application(@CurrentUser() u: AuthUser, @Param('aid', ParseUUIDPipe) aid: string) {
    return this.apps.get(aid, u.id);
  }

  @Patch('calls/:id/applications/:aid')
  setStatus(
    @CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('aid', ParseUUIDPipe) aid: string,
    @Body(new ZodPipe(updateApplicationStatusSchema)) b: UpdateApplicationStatusInput,
  ) {
    return this.apps.setStatus(id, aid, u.id, b);
  }

  @Get('applications/:id')
  getApplication(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.apps.get(id, u.id);
  }

  @Patch('applications/:id')
  updateDraft(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(createApplicationSchema)) b: CreateApplicationInput) {
    return this.apps.updateDraft(id, u.id, b);
  }

  @Post('applications/:id/withdraw')
  withdraw(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.apps.withdraw(id, u.id);
  }

  @Get('org/dashboard')
  dashboard(@CurrentUser() u: AuthUser) {
    return this.calls.dashboard(u.id);
  }
}
