import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
  } from 'typeorm';
  import { Department } from './department.entity';
  
  @Entity('organizations')
  export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true })
    @Index()
    name: string;
  
    @Column({ nullable: true })
    description?: string;
  
    @Column({ default: true })
    isActive: boolean;
  
    @OneToMany(() => Department, (department) => department.organization)
    departments: Department[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }
  