import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  findMine(@Req() request: { user: { userId: number } }) {
    return this.notificationsService.findMine(request.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() request: { user: { userId: number } }) {
    return this.notificationsService.markAllAsRead(request.user.userId);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Req() request: { user: { userId: number } },
  ) {
    return this.notificationsService.markAsRead(
      request.user.userId,
      Number(id),
    );
  }
}
