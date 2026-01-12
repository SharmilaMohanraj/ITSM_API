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

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.attachments)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column()
  filename: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;

  @ManyToOne(() => User, (user) => user.attachments)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

