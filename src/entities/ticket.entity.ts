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
import { TicketCategory } from './ticket-category.entity';
import { TicketStatus } from './ticket-status.entity';
import { TicketPriority } from './ticket-priority.entity';
import { Department } from './department.entity';

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

  @Column({ name: 'department_id', nullable: true })
  @Index()
  departmentId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => TicketCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: TicketCategory;

  @Column({ name: 'priority_id', nullable: true })
  priorityId: string;

  @ManyToOne(() => TicketPriority, { nullable: true })
  @JoinColumn({ name: 'priority_id' })
  priority: TicketPriority;

  @Column({ name: 'status_id', nullable: true })
  statusId: string;

  @ManyToOne(() => TicketStatus, { nullable: true })
  @JoinColumn({ name: 'status_id' })
  status: TicketStatus;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_for', nullable: true })
  createdForId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_for' })
  createdFor: User;

  @Column({ name: 'assigned_to_manager', nullable: true })
  assignedToManagerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_manager' })
  assignedToManager: User;

  @Column({ name: 'assigned_to_executive', nullable: true })
  assignedToExecutiveId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_executive' })
  assignedToExecutive: User;

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
