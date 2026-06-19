import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';
import { CreateJobPostDto } from './dto/create-job-post.dto';
import { UpdateJobApplicationStatusDto } from './dto/update-job-application-status.dto';
import { UpdateJobPostDto } from './dto/update-job-post.dto';
import { UpdateJobPostStatusDto } from './dto/update-job-post-status.dto';
import { JobPostsService } from './job-posts.service';

@Controller('job-posts')
export class JobPostsController {
  constructor(private readonly jobPostsService: JobPostsService) {}

  @Get()
  findOpen() {
    return this.jobPostsService.findOpen();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() request: { user: { userId: number } },
    @Body() createJobPostDto: CreateJobPostDto,
  ) {
    return this.jobPostsService.create(request.user.userId, createJobPostDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Req() request: { user: { userId: number } }) {
    return this.jobPostsService.findMine(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateJobPostDto: UpdateJobPostDto,
  ) {
    return this.jobPostsService.update(
      request.user.userId,
      Number(id),
      updateJobPostDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateJobPostStatusDto: UpdateJobPostStatusDto,
  ) {
    return this.jobPostsService.updateStatus(
      request.user.userId,
      Number(id),
      updateJobPostStatusDto.status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/me')
  findMyApplications(@Req() request: { user: { userId: number } }) {
    return this.jobPostsService.findMyApplications(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('applications/:id/status')
  updateApplicationStatus(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() updateJobApplicationStatusDto: UpdateJobApplicationStatusDto,
  ) {
    return this.jobPostsService.updateApplicationStatus(
      request.user.userId,
      Number(id),
      updateJobApplicationStatusDto.status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('applications/:id/withdraw')
  withdrawApplication(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
  ) {
    return this.jobPostsService.withdrawApplication(
      request.user.userId,
      Number(id),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/applications')
  apply(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
    @Body() createJobApplicationDto: CreateJobApplicationDto,
  ) {
    return this.jobPostsService.apply(
      request.user.userId,
      Number(id),
      createJobApplicationDto,
    );
  }
}
