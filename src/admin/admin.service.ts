import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { TicketCategory } from '../entities/ticket-category.entity';
import { UserCategory } from '../entities/user-category.entity';
import { Ticket } from '../entities/ticket.entity';
import { AddRoleDto } from './dto/add-role.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { RemoveCategoryDto } from './dto/remove-category.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { TicketStatus } from 'src/entities/ticket-status.entity';
import { NotificationRule, TicketEvent } from 'src/entities/notification-rule.entity';
import { RabbitMQService } from '../notifications/rabbitmq.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(TicketCategory)
    private categoryRepository: Repository<TicketCategory>,
    @InjectRepository(UserCategory)
    private userCategoryRepository: Repository<UserCategory>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketStatus)
    private statusRepository: Repository<TicketStatus>,
    @InjectRepository(NotificationRule)
    private notificationRuleRepository: Repository<NotificationRule>,
    private rabbitMQService: RabbitMQService,
  ) {}

  async addRoleToUser(addRoleDto: AddRoleDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: addRoleDto.userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findOne({
      where: { id: addRoleDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user already has this role
    if (user.roles?.some((r) => r.id === role.id)) {
      throw new BadRequestException('User already has this role');
    }

    // If adding IT Manager role, automatically add employee role
    if (role.key === 'it_manager') {
      const employeeRole = await this.roleRepository.findOne({
        where: { key: 'employee' },
      });
      if (employeeRole && !user.roles?.some((r) => r.id === employeeRole.id)) {
        user.roles = [...(user.roles || []), employeeRole];
      }
    }

    user.roles = [...(user.roles || []), role];
    return this.userRepository.save(user);
  }

  async removeRoleFromUser(removeRoleDto: RemoveRoleDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: removeRoleDto.userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findOne({
      where: { id: removeRoleDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent removing super_admin role
    if (role.key === 'super_admin') {
      throw new ForbiddenException('Cannot remove super_admin role');
    }

    // If removing IT Manager role, also remove all category mappings
    if (role.key === 'it_manager') {
      await this.userCategoryRepository.delete({ user: { id: user.id } });
    }

    user.roles = user.roles?.filter((r) => r.id !== role.id) || [];
    return this.userRepository.save(user);
  }

  async addCategoryToUser(addCategoryDto: AddCategoryDto): Promise<UserCategory> {
    const user = await this.userRepository.findOne({
      where: { id: addCategoryDto.userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user is an IT Manager
    const isITManager = user.roles?.some((role) => role.key === 'it_manager');
    if (!isITManager) {
      throw new BadRequestException('Category mapping is only allowed for IT Managers');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: addCategoryDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if mapping already exists
    const existingMapping = await this.userCategoryRepository.findOne({
      where: {
        userId: user.id,
        categoryId: category.id,
      },
    });

    if (existingMapping) {
      throw new BadRequestException('User is already mapped to this category');
    }

    const userCategory = this.userCategoryRepository.create({
      userId: user.id,
      categoryId: category.id,
      user,
      category,
    });

    return this.userCategoryRepository.save(userCategory);
  }

  async removeCategoryFromUser(removeCategoryDto: RemoveCategoryDto): Promise<void> {
    const userCategory = await this.userCategoryRepository.findOne({
      where: {
        userId: removeCategoryDto.userId,
        categoryId: removeCategoryDto.categoryId,
      },
    });

    if (!userCategory) {
      throw new NotFoundException('Category mapping not found');
    }

    await this.userCategoryRepository.remove(userCategory);
  }

  async findAllUsers(filterDto: FilterUsersDto): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.userCategories', 'userCategories')
      .leftJoinAndSelect('userCategories.category', 'category');

    if (filterDto.roleId) {
      queryBuilder.andWhere('roles.id = :roleId', { roleId: filterDto.roleId });
    }

    if (filterDto.categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', {
        categoryId: filterDto.categoryId,
      });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async assignTicketToITManager(assignTicketDto: AssignTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: assignTicketDto.ticketId },
      relations: ['category', 'assignedTo', 'status'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: assignTicketDto.userId },
      relations: ['roles', 'userCategories', 'userCategories.category'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user is an IT Manager
    const isITManager = user.roles?.some((role) => role.key === 'it_manager');
    if (!isITManager) {
      throw new BadRequestException('Can only assign tickets to IT Managers');
    }

    // Verify ticket category matches IT Manager's categories
    if (ticket.categoryId) {
      const hasCategory = user.userCategories?.some(
        (uc) => uc.category.id === ticket.categoryId,
      );

      if (!hasCategory) {
        throw new BadRequestException(
          'Ticket category does not match any of the IT Manager\'s assigned categories',
        );
      }
    }

    ticket.assignedTo = user;
    ticket.assignedToId = user.id;

    const status = await this.statusRepository.findOne({ where: { name: 'Assigned' } });
    
    const notificationRule = await this.notificationRuleRepository.findOne({
      where: {
        event: TicketEvent.ASSIGN,
      },
    });
    if (notificationRule) {
    await this.rabbitMQService.publishTicketStatusChange({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      oldStatus: ticket.status.name,
      newStatus: status.name,
      comment: 'Ticket assigned to IT Manager',
      event: TicketEvent.ASSIGN,
      });
    }

    if (status) {
      ticket.status = status;
      ticket.statusId = status.id;
    }
    return this.ticketRepository.save(ticket);
  }
}
