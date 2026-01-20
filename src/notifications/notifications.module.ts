import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { RabbitMQService } from './rabbitmq.service';
import { TemplateService } from './template.service';
import { NotificationRule } from 'src/entities/notification-rule.entity';
import { Ticket } from 'src/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Ticket, NotificationRule])],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, RabbitMQService, TemplateService],
  exports: [NotificationsService, EmailService, RabbitMQService, TemplateService],
})
export class NotificationsModule {}
