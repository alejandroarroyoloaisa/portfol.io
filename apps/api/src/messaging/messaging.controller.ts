import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { sendMessageSchema, SendMessageInput, startConversationSchema, StartConversationInput } from '@portfolio/schemas';
import { AuthUser, CurrentUser } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { MessagingService } from './messaging.service';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class MessagingController {
  constructor(private svc: MessagingService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('q') q?: string) {
    return this.svc.list(u.id, q);
  }

  @Get('quick-replies')
  quick() {
    return this.svc.quickReplies();
  }

  @Post()
  start(@CurrentUser() u: AuthUser, @Body(new ZodPipe(startConversationSchema)) b: StartConversationInput) {
    return this.svc.start(u.id, b);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.get(id, u.id);
  }

  @Get(':id/messages')
  messages(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('before') before?: string) {
    return this.svc.messages(id, u.id, before);
  }

  @Post(':id/messages')
  send(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(sendMessageSchema)) b: SendMessageInput) {
    return this.svc.send(id, u.id, b);
  }

  @Post(':id/read')
  @HttpCode(204)
  read(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.read(id, u.id);
  }
}
