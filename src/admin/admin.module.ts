import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { TicketCategory } from '../entities/ticket-category.entity';
import { UserCategory } from '../entities/user-category.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketStatus } from 'src/entities/ticket-status.entity';
import { NotificationRule } from 'src/entities/notification-rule.entity';
import { Notification } from 'src/entities/notification.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      TicketCategory,
      UserCategory,
      Ticket, 
      TicketStatus,
      NotificationRule,
      Notification,
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
