import { Module } from '@nestjs/common';
import { ArtistCategoriesService } from './artist-categories.service';
import { ArtistCategoriesController } from './artist-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArtistCategoriesController],
  providers: [ArtistCategoriesService],
})
export class ArtistCategoriesModule {}