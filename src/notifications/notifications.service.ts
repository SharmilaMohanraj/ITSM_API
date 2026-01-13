import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../entities/notification.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: string, message: string, ticketId?: string): Promise<Notification> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const notification = this.notificationRepository.create({
      userId,
      user,
      message,
      status: NotificationStatus.UNREAD,
      ticketId: ticketId || null,
    });

    return this.notificationRepository.save(notification);
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
