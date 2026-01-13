import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { TicketHistory } from './ticket-history.entity';

export enum TicketCategory {
  HARDWARE = 'Hardware',
  SOFTWARE = 'Software',
  NETWORK = 'Network',
  ACCESS_PERMISSIONS = 'Access and Permissions',
  INFRASTRUCTURE = 'Infrastructure',
  SECURITY = 'Security',
  REQUEST = 'Request',
}

export enum TicketPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum TicketStatus {
  NEW = 'New',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'In Progress',
  WAITING = 'Waiting',
  ON_HOLD = 'On Hold',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
  CANCELLED = 'Cancelled',
  ESCALATED = 'Escalated',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_number', unique: true })
  @Index()
  ticketNumber: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketCategory,
  })
  category: TicketCategory;

  @Column({
    type: 'enum',
    enum: TicketPriority,
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.NEW,
  })
  status: TicketStatus;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column('jsonb', { name: 'conversation_context', nullable: true })
  conversationContext: Record<string, any>;

  @Column('jsonb', { name: 'summary', nullable: true })
  summary: Record<string, any>;

  @Column({ name: 'sla_response_due', type: 'timestamp', nullable: true })
  slaResponseDue: Date;

  @Column({ name: 'sla_resolution_due', type: 'timestamp', nullable: true })
  slaResolutionDue: Date;

  @Column({ name: 'sla_response_breached', default: false })
  slaResponseBreached: boolean;

  @Column({ name: 'sla_resolution_breached', default: false })
  slaResolutionBreached: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.ticket)
  attachments: Attachment[];

  @OneToMany(() => TicketHistory, (history) => history.ticket)
  history: TicketHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
