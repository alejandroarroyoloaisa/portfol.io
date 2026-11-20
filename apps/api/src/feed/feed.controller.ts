import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/auth';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
export class FeedController {
  constructor(private svc: FeedService) {}
  @Get()
  feed(@CurrentUser() u: AuthUser, @Query('cursor') cursor?: string) {
    return this.svc.feed(u.id, cursor);
  }
}
