import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService, private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.svc.list(u.id);
  }

  @Patch(':id')
  @HttpCode(204)
  async read(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: { read?: boolean }) {
    await this.prisma.notification.updateMany({ where: { id, userId: u.id }, data: { read: b.read ?? true } });
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@CurrentUser() u: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: u.id, read: false }, data: { read: true } });
  }
}
