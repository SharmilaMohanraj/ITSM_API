import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategory } from '../entities/ticket-category.entity';
import { TicketStatus } from '../entities/ticket-status.entity';
import { TicketPriority } from '../entities/ticket-priority.entity';
import { Role } from '../entities/role.entity';
import { Department } from 'src/entities/department.entity';

@Injectable()
export class LookupService {
  constructor(
    @InjectRepository(TicketCategory)
    private categoryRepository: Repository<TicketCategory>,
    @InjectRepository(TicketStatus)
    private statusRepository: Repository<TicketStatus>,
    @InjectRepository(TicketPriority)
    private priorityRepository: Repository<TicketPriority>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async findAllCategories(departmentId?: string): Promise<TicketCategory[]> {
    const whereCondition: any = { isActive: true };
    
    if (departmentId) {
      whereCondition.departmentId = departmentId;
    }

    return this.categoryRepository.find({
      where: whereCondition,
      order: { name: 'ASC' },
    });
  }

  async findAllStatuses(): Promise<TicketStatus[]> {
    return this.statusRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findAllPriorities(): Promise<TicketPriority[]> {
    return this.priorityRepository.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findAllDepartments(): Promise<Department[]> {
    return this.departmentRepository.find({
      order: { name: 'ASC' },
    });
  }
}
