import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategory } from '../entities/ticket-category.entity';
import { TicketStatus } from '../entities/ticket-status.entity';
import { TicketPriority } from '../entities/ticket-priority.entity';

@Injectable()
export class LookupService {
  constructor(
    @InjectRepository(TicketCategory)
    private categoryRepository: Repository<TicketCategory>,
    @InjectRepository(TicketStatus)
    private statusRepository: Repository<TicketStatus>,
    @InjectRepository(TicketPriority)
    private priorityRepository: Repository<TicketPriority>,
  ) {}

  async findAllCategories(): Promise<TicketCategory[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
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
}
