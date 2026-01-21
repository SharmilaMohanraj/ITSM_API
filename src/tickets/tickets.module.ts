import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Comment } from '../entities/comment.entity';
import { TicketHistory } from '../entities/ticket-history.entity';
import { TicketCategory } from '../entities/ticket-category.entity';
import { TicketStatus } from '../entities/ticket-status.entity';
import { TicketPriority } from '../entities/ticket-priority.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationRule } from 'src/entities/notification-rule.entity';
import { Department } from 'src/entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      User,
      Comment,
      TicketHistory,
      TicketCategory,
      TicketStatus,
      TicketPriority,
      NotificationRule,
      Department,
    ]),
    NotificationsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

