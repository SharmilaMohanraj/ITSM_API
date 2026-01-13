import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Ticket } from './ticket.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { TicketHistory } from './ticket-history.entity';

export enum UserRole {
  EMPLOYEE = 'employee',
  IT_MANAGER = 'it_manager',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ nullable: true })
  department: string;

  @Column({ name: 'team_id', nullable: true })
  teamId: string;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column('jsonb', { nullable: true })
  skills: Record<string, any>;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.createdBy)
  createdTickets: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignedTo)
  assignedTickets: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.uploadedBy)
  attachments: Attachment[];

  @OneToMany(() => TicketHistory, (history) => history.changedBy)
  ticketHistory: TicketHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
