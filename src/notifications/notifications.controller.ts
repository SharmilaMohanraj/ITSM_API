import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread')
  findAllUnread(@Request() req) {
    return this.notificationsService.findAllUnread(req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }
}
