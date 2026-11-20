import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { commentSchema, createArtworkSchema, CreateArtworkInput, updateArtworkSchema, UpdateArtworkInput } from '@portfolio/schemas';
import { AuthUser, CurrentUser, OptionalUser, Public, Roles } from '../common/auth';
import { ZodPipe } from '../common/zod';
import { ArtworksService } from './artworks.service';

@ApiTags('artworks')
@ApiBearerAuth()
@Controller()
export class ArtworksController {
  constructor(private svc: ArtworksService) {}

  @Public()
  @Get('artworks/:id')
  get(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() u?: AuthUser) {
    return this.svc.get(id, u?.id);
  }

  @Roles('artista')
  @Post('artworks')
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(createArtworkSchema)) b: CreateArtworkInput) {
    return this.svc.create(u.id, b);
  }

  @Patch('artworks/:id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(updateArtworkSchema)) b: UpdateArtworkInput) {
    return this.svc.update(id, u.id, b);
  }

  @Delete('artworks/:id')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(id, u.id);
  }

  @Post('artworks/:id/like')
  @HttpCode(200)
  like(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.like(id, u.id);
  }

  @Delete('artworks/:id/like')
  unlike(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.unlike(id, u.id);
  }

  @Post('artworks/:id/save')
  @HttpCode(200)
  save(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.save(id, u.id);
  }

  @Delete('artworks/:id/save')
  unsave(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.unsave(id, u.id);
  }

  @Public()
  @Get('artworks/:id/comments')
  comments(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.comments(id);
  }

  @Post('artworks/:id/comments')
  comment(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(commentSchema)) b: { text: string }) {
    return this.svc.comment(id, u.id, b.text);
  }

  @Public()
  @Get('series/:id')
  series(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() u?: AuthUser) {
    return this.svc.seriesExhibition(id, u?.id);
  }

  @Public()
  @Get('exhibitions/:id')
  exhibition(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() u?: AuthUser) {
    return this.svc.exhibition(id, u?.id);
  }
}
