import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { NetworkService } from './network.service';

@ApiTags('connections')
@ApiBearerAuth()
@Controller('connections')
export class NetworkController {
  constructor(private svc: NetworkService) {}

  @Get()
  overview(@CurrentUser() u: AuthUser) {
    return this.svc.overview(u.id);
  }

  @Get('list')
  list(@CurrentUser() u: AuthUser) {
    return this.svc.list(u.id);
  }

  @Post()
  connect(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ userId: z.string().uuid() }))) b: { userId: string }) {
    return this.svc.connect(u.id, b.userId);
  }

  @Post(':id/accept')
  @HttpCode(204)
  accept(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.accept(u.id, id);
  }

  @Post(':id/ignore')
  @HttpCode(204)
  ignore(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.ignore(u.id, id);
  }

  @Delete('user/:userId')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.svc.remove(u.id, userId);
  }
}
