import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateArtistProfileDto } from './dto/update-artist-profile.dto';
import { ArtistsService } from './artists.service';


@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  findAll() {
    return this.artistsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  createMyProfile(
    @Req() request: { user: { userId: number } },
    @Body() updateArtistProfileDto: UpdateArtistProfileDto,
  ) {
    return this.artistsService.createMyProfile(
      request.user.userId,
      updateArtistProfileDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @Req() request: { user: { userId: number } },
    @Body() updateArtistProfileDto: UpdateArtistProfileDto,
  ) {
    return this.artistsService.updateMyProfile(
      request.user.userId,
      updateArtistProfileDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/metrics')
  getMyMetrics(@Req() request: { user: { userId: number } }) {
    return this.artistsService.getMyMetrics(request.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.artistsService.findOne(Number(id));
  }
}
