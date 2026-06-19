import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  findAll() {
    return this.portfolioService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/like-status')
  getLikeStatus(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
  ) {
    return this.portfolioService.getLikeStatus(
      Number(id),
      request.user.userId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portfolioService.findOne(Number(id));
  }

  @Post(':id/view')
  incrementView(@Param('id') id: string) {
    return this.portfolioService.incrementView(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
  ) {
    return this.portfolioService.toggleLike(Number(id), request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() request: { user: { userId: number } },
    @Body() createPortfolioItemDto: CreatePortfolioItemDto,
  ) {
    return this.portfolioService.createForUser(
      request.user.userId,
      createPortfolioItemDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateMine(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() createPortfolioItemDto: CreatePortfolioItemDto,
  ) {
    return this.portfolioService.updateForUser(
      Number(id),
      request.user.userId,
      createPortfolioItemDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  removeMine(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
  ) {
    return this.portfolioService.removeForUser(Number(id), request.user.userId);
  }
}
