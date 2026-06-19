import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JobPostsController } from './job-posts.controller';
import { JobPostsService } from './job-posts.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [JobPostsController],
  providers: [JobPostsService],
})
export class JobPostsModule {}
