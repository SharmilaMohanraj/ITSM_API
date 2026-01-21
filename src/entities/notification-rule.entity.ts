import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export enum TicketEvent {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    ASSIGN = 'ASSIGN',
    STATUS_CHANGE = 'STATUS_CHANGE',
  }
  
  export enum RecipientType {
    CREATED_BY = 'CREATED_BY',
    ASSIGNED_TO = 'ASSIGNED_TO',
    DEPARTMENT_IT_MANAGERS = 'DEPARTMENT_IT_MANAGERS',
  }
  
  @Entity('notification_rules')
  export class NotificationRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'enum', enum: TicketEvent })
    event: TicketEvent;
  
    @Column({ type: 'enum', enum: RecipientType, array: true })
    recipientType: RecipientType[];
  
    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  }
  