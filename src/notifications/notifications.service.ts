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
      const ticket = await this.ticketRepository.findOne({ where: { id: ticketId }, relations: ['category', 'priority', 'status', 'createdFor'] });
      const createdFor = ticket.createdFor;
      if (ticket) {
        if (notificationRule.recipientType.includes(RecipientType.CREATED_BY) && createdFor) {
          const notification = await this.notificationRepository.create({
            userId: createdFor.id,
            user: createdFor,
            message,
            status: NotificationStatus.UNREAD,
            ticketId: ticketId || null,
          });
          await this.notificationRepository.save(notification);
          if (event === TicketEvent.CREATE) {
            await this.emailService.sendTicketCreatedEmail(createdFor.email, createdFor.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, ticket.status.name, 'ticket-created');
          } else if (event === TicketEvent.STATUS_CHANGE) {
            if (newStatus === 'Resolved') {
              await this.emailService.sendTicketResolvedEmail(createdFor.email, createdFor.fullName, ticket.ticketNumber, 'ticket-resolved');
            } else {
              await this.emailService.sendTicketStatusChangeEmail(createdFor.email, createdFor.fullName, ticket.ticketNumber, oldStatus, newStatus, 'ticket-status-change');
            }
          } else if (event === TicketEvent.ASSIGN) {
            await this.emailService.sendTicketAssignedEmail(createdFor.email, createdFor.fullName, ticket.ticketNumber, ticket.title, ticket.category.name, ticket.priority.name, 'ticket-assigned');
          }
        }
        if (notificationRule.recipientType.includes(RecipientType.ASSIGNED_TO)) {
          if (ticket.assignedToManagerId) {
            const user = await this.userRepository.findOne({ where: { id: ticket.assignedToManagerId } });
            if (user) {
              const notification = await this.notificationRepository.create({
                userId: createdFor.id,
                user: createdFor,
                managerId: ticket.assignedToManagerId,
                manager: user,
                message,
                status: NotificationStatus.UNREAD,
                ticketId: ticketId || null,
              });
              await this.notificationRepository.save(notification);
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
         if (ticket.assignedToExecutiveId) {
          const user = await this.userRepository.findOne({ where: { id: ticket.assignedToExecutiveId } });
          if (user) {
            const notification = await this.notificationRepository.create({
              userId: createdFor.id,
              user: createdFor,
              executiveId: ticket.assignedToExecutiveId,
              executive: user,
              message,
              status: NotificationStatus.UNREAD,
              ticketId: ticketId || null,
            });
            await this.notificationRepository.save(notification);
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
      
      if (notificationRule.recipientType.includes(RecipientType.DEPARTMENT_IT_MANAGERS) && ticket.departmentId) {
        const departmentITManagers: User[] = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role', 'role.key = :roleKey', {
          roleKey: 'manager',
        })
        .innerJoin('user.departments', 'department')
        .where('department.id = :departmentId', { departmentId: ticket.departmentId })
        .select([
          'user.id',
          'user.email',
          'user.fullName',
        ])
        .getMany();
        for (const user of departmentITManagers) {
          const notification = await this.notificationRepository.create({
            userId: createdFor.id,
            user: createdFor,
            managerId: user.id,
            manager: user,
            message,
            status: NotificationStatus.UNREAD,
            ticketId: ticketId || null,
          });
          await this.notificationRepository.save(notification);
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
