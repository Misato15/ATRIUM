import { BadRequestException, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailService } from './mail.service';

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('verify')
  verifyConnection() {
    return this.mailService.verifyConnection();
  }

  @Post('test')
  sendTestEmail(@Req() request: { user: { email: string } }) {
    if (!this.mailService.isConfigured()) {
      throw new BadRequestException('SMTP no esta configurado');
    }

    return this.mailService.sendTestEmail(request.user.email);
  }
}
