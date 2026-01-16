import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { TicketCategory } from './ticket-category.entity';

/**
 * Mapping table for IT Managers and their assigned ticket categories.
 * Only users with IT Manager role should have entries in this table.
 */
@Entity('user_categories')
@Unique(['userId', 'categoryId'])
export class UserCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => TicketCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: TicketCategory;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
