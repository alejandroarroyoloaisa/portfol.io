import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { searchSchema } from '@portfolio/schemas';
import { z } from 'zod';
import { AuthUser, OptionalUser, Public } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}
  @Public()
  @Get()
  search(@Query(new ZodPipe(searchSchema)) q: z.output<typeof searchSchema>, @OptionalUser() u?: AuthUser) {
    return this.svc.search(u?.id, q);
  }
}
