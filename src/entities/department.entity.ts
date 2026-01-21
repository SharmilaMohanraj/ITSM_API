import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToMany,
  } from 'typeorm';
  import { Organization } from './organization.entity';
import { User } from './user.entity';
  
  @Entity('departments')
  @Index(['organizationId', 'name'], { unique: true })
  export class Department {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'organization_id' })
    @Index()
    organizationId: string;
  
    @ManyToOne(() => Organization, (org) => org.departments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;
  
    @Column()
    name: string;
  
    @Column({ nullable: true })
    description?: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @ManyToMany(() => User, (user) => user.departments)
    users: User[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  