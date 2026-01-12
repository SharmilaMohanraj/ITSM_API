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

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.comments)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text')
  content: string;

  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

