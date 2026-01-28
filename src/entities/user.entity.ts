import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Team } from './team.entity';
import { Ticket } from './ticket.entity';
import { Comment } from './comment.entity';
import { Attachment } from './attachment.entity';
import { TicketHistory } from './ticket-history.entity';
import { Role } from './role.entity';
import { UserCategory } from './user-category.entity';
import { Department } from './department.entity';

// Keep enum for backward compatibility - now maps to role keys
export enum UserRole {
  EMPLOYEE = 'employee',
  IT_MANAGER = 'manager',
  IT_EXECUTIVE = 'it_executive',
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'unique_key', unique: true, nullable: true })
  uniqueKey: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @ManyToMany (() => Department, (department) => department.users)
  @JoinTable({
    name: 'user_departments',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'department_id', referencedColumnName: 'id' },
  })
  departments: Department[];

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

  @OneToMany(() => Ticket, (ticket) => ticket.createdFor)
  createdForTickets: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignedToManager)
  assignedToManagerTickets: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.assignedToExecutive)
  assignedToExecutiveTickets: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Attachment, (attachment) => attachment.uploadedBy)
  attachments: Attachment[];

  @OneToMany(() => TicketHistory, (history) => history.changedBy)
  ticketHistory: TicketHistory[];

  @OneToMany(() => UserCategory, (userCategory) => userCategory.user)
  userCategories: UserCategory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
