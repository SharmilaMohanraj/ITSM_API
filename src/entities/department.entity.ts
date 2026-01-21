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
    OneToMany,
  } from 'typeorm';
  import { Organization } from './organization.entity';
import { User } from './user.entity';
import { TicketCategory } from './ticket-category.entity';
  
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

    @OneToMany(() => TicketCategory, (category) => category.department)
    categories: TicketCategory[];
  
    @ManyToMany(() => User, (user) => user.departments)
    users: User[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  