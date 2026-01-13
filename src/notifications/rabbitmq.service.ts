import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';

export interface TicketStatusChangeEvent {
  userId: string;
  userEmail: string;
  userName: string;
  ticketId: string;
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly queueName = 'ticket-notifications';

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.setupQueue();
    await this.consumeMessages();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      const rabbitmqUrl =
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://guest:guest@localhost:5672';

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async setupQueue() {
    await this.channel.assertQueue(this.queueName, {
      durable: true,
    });
    this.logger.log(`Queue ${this.queueName} is ready`);
  }

  private async consumeMessages() {
    await this.channel.consume(
      this.queueName,
      async (msg) => {
        if (msg) {
          try {
            const event: TicketStatusChangeEvent = JSON.parse(msg.content.toString());
            await this.handleTicketStatusChange(event);
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing message:', error);
            this.channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    );
    this.logger.log(`Started consuming messages from ${this.queueName}`);
  }

  async publishTicketStatusChange(event: TicketStatusChangeEvent): Promise<void> {
    try {
      const message = JSON.stringify(event);
      this.channel.sendToQueue(this.queueName, Buffer.from(message), {
        persistent: true,
      });
      this.logger.log(`Published ticket status change event for ticket ${event.ticketNumber}`);
    } catch (error) {
      this.logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  private async handleTicketStatusChange(event: TicketStatusChangeEvent): Promise<void> {
    try {
      // Create notification in database
      const message = `Ticket ${event.ticketNumber} status changed from ${event.oldStatus} to ${event.newStatus}`;
      await this.notificationsService.create(event.userId, message, event.ticketId);

      // Send email notification
      if (event.newStatus.toLowerCase() === 'resolved') {
        await this.emailService.sendTicketResolvedEmail(
          event.userEmail,
          event.userName,
          event.ticketNumber,
          event.comment,
        );
      } else {
        await this.emailService.sendTicketStatusChangeEmail(
          event.userEmail,
          event.userName,
          event.ticketNumber,
          event.oldStatus,
          event.newStatus,
        );
      }

      this.logger.log(
        `Processed ticket status change notification for ticket ${event.ticketNumber}`,
      );
    } catch (error) {
      this.logger.error('Error handling ticket status change:', error);
      throw error;
    }
  }

  private async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}
