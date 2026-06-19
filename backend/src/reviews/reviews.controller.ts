import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('clients')
  createClientReview(
    @Req() request: { user: { userId: number } },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createClientReview(
      request.user.userId,
      createReviewDto,
    );
  }

  @Get('artists/:artistProfileId')
  findByArtist(@Param('artistProfileId') artistProfileId: string) {
    return this.reviewsService.findByArtist(Number(artistProfileId));
  }
}
