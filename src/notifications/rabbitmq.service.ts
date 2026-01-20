import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { TicketEvent } from 'src/entities/notification-rule.entity';

export interface TicketStatusChangeEvent {
  ticketId: string;
  ticketNumber: string;
  oldStatus: string;
  newStatus: string;
  comment?: string;
  event: TicketEvent;
}

export interface TicketCreateEvent {
  ticketId: string;
  ticketNumber: string;
  categoryName: string;
  priorityName: string;
  event: TicketEvent;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly queueName = 'ticket-notifications';

  constructor(
    private configService: ConfigService,
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
            const event: any = JSON.parse(msg.content.toString());
            if (event.event === TicketEvent.STATUS_CHANGE || event.event === TicketEvent.ASSIGN) {
              await this.handleTicketStatusChange(event);
            } else if (event.event === TicketEvent.CREATE) {
              await this.handleTicketCreateEvent(event);
            }
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

  async publishTicketCreateEvent(event: TicketCreateEvent): Promise<void> {
    try {
      const message = JSON.stringify(event);
      this.channel.sendToQueue(this.queueName, Buffer.from(message), {
        persistent: true,
      });
      this.logger.log(`Published ticket create event for ticket ${event.ticketNumber}`);
    } catch (error) {
      this.logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  private async handleTicketStatusChange(event: TicketStatusChangeEvent): Promise<void> {
    try {
      // Create notification in database
      let message;
      if (event.event === TicketEvent.ASSIGN) {
        message = `Ticket ${event.ticketNumber} assigned to IT Manager`;
      } else {
        message = `Ticket ${event.ticketNumber} status changed from ${event.oldStatus} to ${event.newStatus}`;
      }
      await this.notificationsService.create(message, event.event, event.oldStatus, event.newStatus, event.ticketId);

      this.logger.log(
        `Processed ticket status change notification for ticket ${event.ticketNumber}`,
      );
    } catch (error) {
      this.logger.error('Error handling ticket status change:', error);
      throw error;
    }
  }

  private async handleTicketCreateEvent(event: TicketCreateEvent): Promise<void> {
    try {
      // Create notification in database
      const message = `Ticket ${event.ticketNumber} created in ${event.categoryName} category with ${event.priorityName} priority`;
      await this.notificationsService.create(message, event.event, null, null, event.ticketId);
    } catch (error) {
      this.logger.error('Error handling ticket create:', error);
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
