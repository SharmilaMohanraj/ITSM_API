import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  PRIORITY_CHANGED = 'priority_changed',
  COMMENT_ADDED = 'comment_added',
  ATTACHMENT_ADDED = 'attachment_added',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('ticket_history')
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.history)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'changed_by' })
  changedById: string;

  @ManyToOne(() => User, (user) => user.ticketHistory)
  @JoinColumn({ name: 'changed_by' })
  changedBy: User;

  @Column({
    name: 'change_type',
    type: 'enum',
    enum: ChangeType,
  })
  changeType: ChangeType;

  @Column({ name: 'field_name', nullable: true })
  fieldName: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

