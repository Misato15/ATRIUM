import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

type AdminRequest = Request & {
  user: {
    userId: number;
    role: string;
  };
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  summary() {
    return this.adminService.summary();
  }

  @Get('users')
  users() {
    return this.adminService.users();
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { isSuspended?: boolean; role?: 'ARTIST' | 'CLIENT' | 'ADMIN' },
  ) {
    return this.adminService.updateUser(request.user.userId, id, body);
  }

  @Get('artists')
  artists() {
    return this.adminService.artists();
  }

  @Patch('artists/:id')
  updateArtist(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { isHidden?: boolean },
  ) {
    return this.adminService.updateArtist(request.user.userId, id, body);
  }

  @Get('portfolio-items')
  portfolioItems() {
    return this.adminService.portfolioItems();
  }

  @Patch('portfolio-items/:id')
  updatePortfolioItem(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { isHidden?: boolean },
  ) {
    return this.adminService.updatePortfolioItem(request.user.userId, id, body);
  }

  @Get('commissions')
  commissions() {
    return this.adminService.commissions();
  }

  @Get('disputes')
  disputes() {
    return this.adminService.disputes();
  }

  @Patch('disputes/:id')
  resolveDispute(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { resolution?: string; commissionStatus?: string },
  ) {
    return this.adminService.resolveDispute(request.user.userId, id, body);
  }

  @Get('payments')
  payments() {
    return this.adminService.payments();
  }

  @Get('job-posts')
  jobPosts() {
    return this.adminService.jobPosts();
  }

  @Patch('job-posts/:id')
  updateJobPost(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { status?: 'OPEN' | 'IN_REVIEW' | 'PAUSED' | 'ASSIGNED' | 'CLOSED' },
  ) {
    return this.adminService.updateJobPost(request.user.userId, id, body);
  }

  @Get('digital-products')
  digitalProducts() {
    return this.adminService.digitalProducts();
  }

  @Patch('digital-products/:id')
  updateDigitalProduct(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AdminRequest,
    @Body() body: { status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
  ) {
    return this.adminService.updateDigitalProduct(request.user.userId, id, body);
  }

  @Get('logs')
  logs() {
    return this.adminService.logs();
  }
}
