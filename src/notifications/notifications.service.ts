import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { NotificationRule, RecipientType, TicketEvent } from 'src/entities/notification-rule.entity';
import { Ticket } from 'src/entities/ticket.entity';
import { Role } from 'src/entities/role.entity';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(NotificationRule)
    private notificationRuleRepository: Repository<NotificationRule>,
    private emailService: EmailService,
  ) {}

  async create(message: string, event: TicketEvent, oldStatus?: string, newStatus?: string, ticketId?: string): Promise<Notification> {
    const notificationRule: NotificationRule | null = await this.notificationRuleRepository.findOne({ where: { event } });
    if (notificationRule) {
      const ticket = await this.ticketRepository.findOne({ where: { id: ticketId }, relations: ['category', 'priority', 'status', 'createdBy'] });
      const createdBy = ticket.createdBy;
      if (ticket) {
        if (notificationRule.recipientType.includes(RecipientType.CREATED_BY) && createdBy) {
          await this.notificationRepository.create({
            userId: createdBy.id,
            user: createdBy,
            message,
            status: NotificationStatus.UNREAD,
            ticketId: ticketId || null,
          });
          if (event === TicketEvent.CREATE) {
            await this.emailService.sendTicketCreatedEmail(createdBy.email, createdBy.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, ticket.status.name, 'ticket-created');
          } else if (event === TicketEvent.STATUS_CHANGE) {
            if (newStatus === 'Resolved') {
              await this.emailService.sendTicketResolvedEmail(createdBy.email, createdBy.fullName, ticket.ticketNumber, 'ticket-resolved');
            } else {
              await this.emailService.sendTicketStatusChangeEmail(createdBy.email, createdBy.fullName, ticket.ticketNumber, oldStatus, newStatus, 'ticket-status-change');
            }
          } else if (event === TicketEvent.ASSIGN) {
            await this.emailService.sendTicketAssignedEmail(createdBy.email, createdBy.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, 'ticket-assigned');
          }
        }
        if (notificationRule.recipientType.includes(RecipientType.ASSIGNED_TO) && ticket.assignedToId) {
          const user = await this.userRepository.findOne({ where: { id: ticket.assignedToId } });
          if (user) {
            await this.notificationRepository.create({
              userId: createdBy.id,
              user: createdBy,
              managerId: user.id,
              manager: user,
              message,
              status: NotificationStatus.UNREAD,
              ticketId: ticketId || null,
            });
            if (event === TicketEvent.CREATE) {
              await this.emailService.sendTicketCreatedEmail(user.email, user.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, ticket.status.name, 'ticket-created-manager');
            } else if (event === TicketEvent.STATUS_CHANGE) {
              if (newStatus === 'Resolved') {
                await this.emailService.sendTicketResolvedEmail(user.email, user.fullName, ticket.ticketNumber, 'ticket-resolved-manager');
              } else {
                await this.emailService.sendTicketStatusChangeEmail(user.email, user.fullName, ticket.ticketNumber, oldStatus, newStatus, 'ticket-status-change-manager');
              }
            } else if (event === TicketEvent.ASSIGN) {
              await this.emailService.sendTicketAssignedEmail(user.email, user.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, 'ticket-assigned-manager');
            }
          }
        }
      
      if (notificationRule.recipientType.includes(RecipientType.CATEGORY_IT_MANAGERS) && ticket.categoryId) {
        const categoryITManagers: User[] = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role', 'role.key = :roleKey', {
          roleKey: 'it_manager',
        })
        .innerJoin('user.userCategories', 'userCategory')
        .where('userCategory.categoryId = :categoryId', { categoryId: ticket.categoryId })
        .select([
          'user.id',
          'user.email',
          'user.fullName',
        ])
        .getMany();
        for (const user of categoryITManagers) {
          await this.notificationRepository.create({
            userId: createdBy.id,
            user: createdBy,
            managerId: user.id,
            manager: user,
            message,
            status: NotificationStatus.UNREAD,
            ticketId: ticketId || null,
          });
          if (event === TicketEvent.CREATE) {
            await this.emailService.sendTicketCreatedEmail(user.email, user.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, ticket.status.name, 'ticket-created-manager');
          } else if (event === TicketEvent.STATUS_CHANGE) {
            if (newStatus === 'Resolved') {
              await this.emailService.sendTicketResolvedEmail(user.email, user.fullName, ticket.ticketNumber, 'ticket-resolved-manager');
            } else {
              await this.emailService.sendTicketStatusChangeEmail(user.email, user.fullName, ticket.ticketNumber, oldStatus, newStatus, 'ticket-status-change-manager');
            }
          } else if (event === TicketEvent.ASSIGN) {
            await this.emailService.sendTicketAssignedEmail(user.email, user.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, 'ticket-assigned-manager');
          }
        }
      }
    }
  }
    return undefined;
  }

  async findAllUnread(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found or does not belong to user');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  async findAll(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
