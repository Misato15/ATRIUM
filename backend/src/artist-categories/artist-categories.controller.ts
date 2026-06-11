import { Controller, Get } from '@nestjs/common';
import { ArtistCategoriesService } from './artist-categories.service';

@Controller('artist-categories')
export class ArtistCategoriesController {
  constructor(
    private readonly artistCategoriesService: ArtistCategoriesService,
  ) {}

  @Get()
  findAll() {
    return this.artistCategoriesService.findAll();
  }
}