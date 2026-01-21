import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Machine-readable identifier (e.g. "employee", "manager", "it_executive")
  @Column({ unique: true })
  key: string;

  // Human-readable label (e.g. "Employee", "Manager", "IT Executive")
  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

