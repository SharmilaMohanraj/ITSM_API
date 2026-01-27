import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Comment } from '../entities/comment.entity';
import { TicketHistory, ChangeType } from '../entities/ticket-history.entity';
import { TicketCategory } from '../entities/ticket-category.entity';
import { TicketStatus } from '../entities/ticket-status.entity';
import { TicketPriority } from '../entities/ticket-priority.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { RabbitMQService } from '../notifications/rabbitmq.service';
import { NotificationRule, TicketEvent } from 'src/entities/notification-rule.entity';
import { Department } from 'src/entities/department.entity';
import { AssignTicketDto } from 'src/admin/dto/assign-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(TicketHistory)
    private ticketHistoryRepository: Repository<TicketHistory>,
    @InjectRepository(TicketCategory)
    private categoryRepository: Repository<TicketCategory>,
    @InjectRepository(TicketStatus)
    private statusRepository: Repository<TicketStatus>,
    @InjectRepository(TicketPriority)
    private priorityRepository: Repository<TicketPriority>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(NotificationRule)
    private notificationRuleRepository: Repository<NotificationRule>,
    private rabbitMQService: RabbitMQService,
  ) {}

  private generateTicketNumber(category: TicketCategory): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${category.code}-${timestamp}-${random}`;
  }

  async create(createTicketDto: CreateTicketDto, userId: string): Promise<Ticket> {
    const createdBy = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!createdBy) {
      throw new NotFoundException('User not found');
    }

    let createdFor: User | null = null;
    if (createTicketDto.createdForId) {
      createdFor = await this.userRepository.findOne({
        where: { id: createTicketDto.createdForId },
      });
      if (!createdFor) {
        throw new NotFoundException('Created for user not found');
      }
    }

    const department = await this.departmentRepository.findOne({
      where: { id: createTicketDto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Validate category, priority, and status
    const category = await this.categoryRepository.findOne({
      where: { id: createTicketDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.departmentId !== department.id) {
      throw new BadRequestException('Category does not belong to the selected department');
    }

    let priority: TicketPriority | null = null;
    if (createTicketDto.priorityId) {
      priority = await this.priorityRepository.findOne({
        where: { id: createTicketDto.priorityId },
      });
      if (!priority) {
        throw new NotFoundException('Priority not found');
      }
    } else {
      // Get default "Medium" priority
      priority = await this.priorityRepository.findOne({
        where: { name: 'Medium' },
      });
      if (!priority) {
        throw new NotFoundException('Default priority "Medium" not found');
      }
    }

    let status: TicketStatus | null = null;
    if (createTicketDto.statusId) {
      status = await this.statusRepository.findOne({
        where: { id: createTicketDto.statusId },
      });
      if (!status) {
        throw new NotFoundException('Status not found');
      }
    } else {
      // Get default "New" status
      status = await this.statusRepository.findOne({
        where: { name: 'New' },
      });
      if (!status) {
        throw new NotFoundException('Default status "New" not found');
      }
    }

    const activeStatuses: TicketStatus[] = await this.statusRepository.find({
      where: {
        name: In(['New', 'Assigned', 'In Progress']),
      },
      select: ['id'],
    });
    const activeStatusIds = activeStatuses.map((status) => status.id);

const managerWithLessActiveTickets =
  await this.userRepository
    .createQueryBuilder('user')
    .innerJoin('user.departments', 'department')
    .innerJoin('user.roles', 'role')
    .leftJoin(
      'user.assignedToManagerTickets',
      'ticket',
      'ticket.statusId IN (:...activeStatusIds)',
      { activeStatusIds: activeStatusIds }
    )
    // .where('department.id = :departmentId', { departmentId: department.id })
    .where('user.isAvailable = true')
    .andWhere('role.key = :roleKey', { roleKey: 'manager' })
    .select([
      'user.id AS "userId"',
      'user.fullName AS "userName"',
      'COUNT(ticket.id) AS "activeTicketCount"',
    ])
    .groupBy('user.id')
    .addGroupBy('user.fullName')
    .orderBy('"activeTicketCount"', 'ASC')
    .limit(1)
    .getRawOne(); // get the user with the least active tickets


    if (!createTicketDto.createdForId) {
      createdFor = createdBy;
    }
    const ticketNumber = this.generateTicketNumber(category);
    const ticket = this.ticketRepository.create({
      title: createTicketDto.title,
      description: createTicketDto.description,
      ticketNumber,
      createdById: userId,
      createdBy,
      createdForId: createTicketDto.createdForId || userId,
      createdFor,
      assignedToManagerId: managerWithLessActiveTickets?.userId || null,
      departmentId: department.id,
      categoryId: createTicketDto.categoryId,
      category,
      department,
      priorityId: priority?.id || null,
      priority,
      statusId: status?.id || null,
      status,
      conversationContext: createTicketDto.conversationContext,
      summary: createTicketDto.summary,
      slaResponseBreached: false,
      slaResolutionBreached: false,
    });

    if (createTicketDto.slaResponseDue) {
      ticket.slaResponseDue = new Date(createTicketDto.slaResponseDue);
    }
    if (createTicketDto.slaResolutionDue) {
      ticket.slaResolutionDue = new Date(createTicketDto.slaResolutionDue);
    }

    const savedTicket = await this.ticketRepository.save(ticket);

    // Create ticket history entry for ticket creation
    const createHistory = this.ticketHistoryRepository.create({
      ticketId: savedTicket.id,
      ticket: savedTicket,
      changedById: userId,
      changedBy: createdBy,
      changeType: ChangeType.CREATED,
      fieldName: null,
      oldValue: null,
      newValue: `Ticket ${savedTicket.ticketNumber} created`,
    });
    await this.ticketHistoryRepository.save(createHistory);

    const notificationRule = await this.notificationRuleRepository.findOne({
      where: {
        event: TicketEvent.CREATE,
      },
    });
    if (notificationRule) {
    await this.rabbitMQService.publishTicketCreateEvent({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      categoryName: ticket.category.name,
      priorityName: ticket.priority.name,
      event: TicketEvent.CREATE,
      });
    }
    // Return ticket with relations including history
    return this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['assignedToManager', 'createdBy', 'createdFor', 'category', 'status', 'priority', 'history'],
    });
  }

  async findAll(userId: string, filterDto: FilterTicketsDto): Promise<any> {
    // Apply filters if provided
    const whereConditions: FindOptionsWhere<Ticket>[] = [
      { createdForId: userId }
    ];

    // Apply filters if provided
    const baseConditions = whereConditions.map((condition) => {
      const filteredCondition = { ...condition };
      if (filterDto.statusId) {
        filteredCondition.statusId = filterDto.statusId;
      }
      if (filterDto.departmentId) {
        filteredCondition.departmentId = filterDto.departmentId;
      }
      if (filterDto.categoryId) {
        filteredCondition.categoryId = filterDto.categoryId;
      }
      if (filterDto.priorityId) {
        filteredCondition.priorityId = filterDto.priorityId;
      }
      return filteredCondition;
    });
    const [data, total]: [Ticket[], number] = await this.ticketRepository.findAndCount({
      where: baseConditions,
      relations: ['assignedToManager', 'createdBy', 'createdFor', 'department', 'category', 'status', 'priority', 'comments'],
      order: { createdAt: 'DESC' },
      skip: (filterDto.page - 1) * filterDto.limit,
      take: filterDto.limit,
    });
    return {
      data,
      meta: {
        total,
        page: filterDto.page,
        limit: filterDto.limit,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }

  async findOne(id: string, userId: string, userRoleKeys: string[]): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'category', 'status', 'priority'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const roleAssignmentMap = {
      manager: ticket.assignedToManagerId,
      it_executive: ticket.assignedToExecutiveId,
    };
    
    const hasAccess =
      ticket.createdById === userId ||
      ticket.createdForId === userId ||
      userRoleKeys.some(
        (role) => roleAssignmentMap[role] === userId
      );
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async findOneByNumber(ticketNumber: string, userId: string, userRoleKeys: string[]): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { ticketNumber },
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'category', 'status', 'priority', 'comments'],
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const roleAssignmentMap = {
      manager: ticket.assignedToManagerId,
      it_executive: ticket.assignedToExecutiveId,
    };
    
    const hasAccess =
      ticket.createdById === userId ||
      ticket.createdForId === userId ||
      userRoleKeys.some(
        (role) => roleAssignmentMap[role] === userId
      );
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    return ticket;
  }

  async updateById(
    id: string,
    updateTicketDto: UpdateTicketDto,
    userId: string,
    userRoleKeys: string[],
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, userId, userRoleKeys);
    return this.update(ticket, updateTicketDto, userId, userRoleKeys);
  }

  async updateByNumber(
    ticketNumber: string,
    updateTicketDto: UpdateTicketDto,
    userId: string,
    userRoleKeys: string[],
  ): Promise<Ticket> {
    const ticket = await this.findOneByNumber(ticketNumber, userId, userRoleKeys);
    return this.update(ticket, updateTicketDto, userId, userRoleKeys);
  }

  async update(
    ticket:Ticket,
    updateTicketDto: UpdateTicketDto,
    userId: string,
    userRoleKeys: string[],
  ): Promise<Ticket> {

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const historyEntries: TicketHistory[] = [];

    if (updateTicketDto.statusId && updateTicketDto.statusId !== ticket.statusId) {
      const newStatus = await this.statusRepository.findOne({
        where: { id: updateTicketDto.statusId },
      });
      if (!newStatus) {
        throw new NotFoundException('Status not found');
      }

      // Create history entry for status change
      const statusHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: ticket.status?.name || ticket.statusId,
        newValue: newStatus.name,
      });
      historyEntries.push(statusHistory);

      ticket.status = newStatus;
      ticket.statusId = newStatus.id;

      if (newStatus.name === 'Resolved' && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }

      if (newStatus.name === 'Closed' && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }

      // Status change event will be published after ticket is saved
    }

    if (updateTicketDto.priorityId && updateTicketDto.priorityId !== ticket.priorityId) {
      const newPriority = await this.priorityRepository.findOne({
        where: { id: updateTicketDto.priorityId },
      });
      if (!newPriority) {
        throw new NotFoundException('Priority not found');
      }

      // Create history entry for priority change
      const priorityHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.PRIORITY_CHANGED,
        fieldName: 'priority',
        oldValue: ticket.priority?.name || ticket.priorityId,
        newValue: newPriority.name,
      });
      historyEntries.push(priorityHistory);

      ticket.priority = newPriority;
      ticket.priorityId = newPriority.id;
    }

    if (updateTicketDto.categoryId && updateTicketDto.categoryId !== ticket.categoryId) {
      const newCategory = await this.categoryRepository.findOne({
        where: { id: updateTicketDto.categoryId },
      });
      if (!newCategory) {
        throw new NotFoundException('Category not found');
      }

      // Create history entry for category change
      const categoryHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.UPDATED,
        fieldName: 'category',
        oldValue: ticket.category?.name || ticket.categoryId,
        newValue: newCategory.name,
      });
      historyEntries.push(categoryHistory);

      ticket.category = newCategory;
      ticket.categoryId = newCategory.id;
    }

    if (updateTicketDto.title && updateTicketDto.title !== ticket.title) {
      // Create history entry for title change
      const titleHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.UPDATED,
        fieldName: 'title',
        oldValue: ticket.title,
        newValue: updateTicketDto.title,
      });
      historyEntries.push(titleHistory);
    }

    if (updateTicketDto.description && updateTicketDto.description !== ticket.description) {
      // Create history entry for description change
      const descHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.UPDATED,
        fieldName: 'description',
        oldValue: ticket.description || '',
        newValue: updateTicketDto.description,
      });
      historyEntries.push(descHistory);
    }

    if (updateTicketDto.slaResponseDue) {
      const newSlaResponseDue = new Date(updateTicketDto.slaResponseDue);
      if (!ticket.slaResponseDue || ticket.slaResponseDue.getTime() !== newSlaResponseDue.getTime()) {
        const slaHistory = this.ticketHistoryRepository.create({
          ticketId: ticket.id,
          ticket,
          changedById: userId,
          changedBy: user,
          changeType: ChangeType.UPDATED,
          fieldName: 'sla_response_due',
          oldValue: ticket.slaResponseDue ? ticket.slaResponseDue.toISOString() : null,
          newValue: newSlaResponseDue.toISOString(),
        });
        historyEntries.push(slaHistory);
        ticket.slaResponseDue = newSlaResponseDue;
      }
    }

    if (updateTicketDto.slaResolutionDue) {
      const newSlaResolutionDue = new Date(updateTicketDto.slaResolutionDue);
      if (!ticket.slaResolutionDue || ticket.slaResolutionDue.getTime() !== newSlaResolutionDue.getTime()) {
        const slaHistory = this.ticketHistoryRepository.create({
          ticketId: ticket.id,
          ticket,
          changedById: userId,
          changedBy: user,
          changeType: ChangeType.UPDATED,
          fieldName: 'sla_resolution_due',
          oldValue: ticket.slaResolutionDue ? ticket.slaResolutionDue.toISOString() : null,
          newValue: newSlaResolutionDue.toISOString(),
        });
        historyEntries.push(slaHistory);
        ticket.slaResolutionDue = newSlaResolutionDue;
      }
    }

    // Update other fields
    if (updateTicketDto.title) {
      ticket.title = updateTicketDto.title;
    }
    if (updateTicketDto.description) {
      ticket.description = updateTicketDto.description;
    }
    if (updateTicketDto.conversationContext) {
      ticket.conversationContext = updateTicketDto.conversationContext;
    }

    const savedTicket = await this.ticketRepository.save(ticket);

    // Save all history entries
    if (historyEntries.length > 0) {
      await this.ticketHistoryRepository.save(historyEntries);
    }

    // Get the updated ticket with relations
    const updatedTicket = await this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'category', 'status', 'priority', 'history'],
    });

    // Publish status change event if status was updated
    if (updateTicketDto.statusId && updatedTicket.status) {
      const statusHistory = historyEntries.find((h) => h.fieldName === 'status');
      if (statusHistory) {
        await this.publishStatusChangeEvent(
          updatedTicket,
          statusHistory.oldValue?.toString() || 'Unknown',
          updatedTicket.status.name,
        );
      }
    }

    return updatedTicket;
  }

  async remove(id: string, userId: string, userRoleKeys: string[]): Promise<void> {

    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.ticketRepository.remove(ticket);
  }

  async updateStatusWithComment(
    id: string,
    updateStatusDto: UpdateTicketStatusDto,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'status'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newStatus = await this.statusRepository.findOne({
      where: { id: updateStatusDto.statusId },
    });
    if (!newStatus) {
      throw new NotFoundException('Status not found');
    }

    const oldStatus = ticket.status;

    // Update ticket status
    ticket.status = newStatus;
    ticket.statusId = newStatus.id;

    // Set resolved_at or closed_at if applicable
    if (newStatus.name === 'Resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (newStatus.name === 'Closed' && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    // Save ticket
    const updatedTicket = await this.ticketRepository.save(ticket);

    // Create comment
    const comment = this.commentRepository.create({
      ticketId: ticket.id,
      ticket,
      userId: user.id,
      user,
      content: updateStatusDto.comment,
      isInternal: updateStatusDto.isInternal || false,
    });
    await this.commentRepository.save(comment);

    // Create ticket history entry for status change
    if (oldStatus?.id !== newStatus.id) {
      const statusHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: user.id,
        changedBy: user,
        changeType: ChangeType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: oldStatus?.name || oldStatus?.id || 'Unknown',
        newValue: newStatus.name,
      });
      await this.ticketHistoryRepository.save(statusHistory);

      // Publish status change event to RabbitMQ
      await this.publishStatusChangeEvent(
        updatedTicket,
        oldStatus?.name || 'Unknown',
        newStatus.name,
        updateStatusDto.comment,
      );
    }

    // Create ticket history entry for comment
    const commentHistory = this.ticketHistoryRepository.create({
      ticketId: ticket.id,
      ticket,
      changedById: user.id,
      changedBy: user,
      changeType: ChangeType.COMMENT_ADDED,
      fieldName: 'comment',
      newValue: updateStatusDto.comment,
    });
    await this.ticketHistoryRepository.save(commentHistory);

    // Return ticket with relations
    return this.ticketRepository.findOne({
      where: { id: ticket.id },
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'department', 'category', 'status', 'priority', 'comments', 'history'],
    });
  }

  async findAllForITManager(
    userId: string,
    filterDto: FilterTicketsDto,
  ): Promise<any> {
    const whereConditions: FindOptionsWhere<Ticket>[] = [
      { assignedToManagerId: userId },
      { assignedToManagerId: null },
    ];

    // Apply filters if provided
    const baseConditions = whereConditions.map((condition) => {
      const filteredCondition = { ...condition };
      if (filterDto.statusId) {
        filteredCondition.statusId = filterDto.statusId;
      }
      if (filterDto.departmentId) {
        filteredCondition.departmentId = filterDto.departmentId;
      }
      if (filterDto.categoryId) {
        filteredCondition.categoryId = filterDto.categoryId;
      }
      if (filterDto.priorityId) {
        filteredCondition.priorityId = filterDto.priorityId;
      }
      return filteredCondition;
    });

    const [data, total]: [Ticket[], number] = await this.ticketRepository.findAndCount({
      where: baseConditions,
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy','department', 'category', 'status', 'priority', 'comments'],
      order: { createdAt: 'DESC' },
      skip: (filterDto.page - 1) * filterDto.limit,
      take: filterDto.limit,
    });
  
    return {
      data,
      meta: {
        total,
        page: filterDto.page,
        limit: filterDto.limit,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }
  

  async findAllForITExecutive(
    userId: string,
    filterDto: FilterTicketsDto,
  ): Promise<any> {
    const whereConditions: FindOptionsWhere<Ticket>[] = [
      { assignedToExecutiveId: userId } // only assigned to IT Executive
    ];

    // Apply filters if provided
    const baseConditions = whereConditions.map((condition) => {
      const filteredCondition = { ...condition };
      if (filterDto.statusId) {
        filteredCondition.statusId = filterDto.statusId;
      }
      if (filterDto.departmentId) {
        filteredCondition.departmentId = filterDto.departmentId;
      }
      if (filterDto.categoryId) {
        filteredCondition.categoryId = filterDto.categoryId;
      }
      if (filterDto.priorityId) {
        filteredCondition.priorityId = filterDto.priorityId;
      }
      return filteredCondition;
    });

    const [data, total]: [Ticket[], number] = await this.ticketRepository.findAndCount({
      where: baseConditions,
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'department', 'category', 'status', 'priority', 'comments'],
      order: { createdAt: 'DESC' },
      skip: (filterDto.page - 1) * filterDto.limit,
      take: filterDto.limit,
    });
  
    return {
      data,
      meta: {
        total,
        page: filterDto.page,
        limit: filterDto.limit,
        totalPages: Math.ceil(total / filterDto.limit),
      },
    };
  }

  async findLastRaisedTicketForEmployee(
    userId: string,
    filterDto: FilterTicketsDto,
  ): Promise<Ticket | null> {
    const whereCondition: FindOptionsWhere<Ticket> = {
      createdForId: userId,
    };

    // Apply filters if provided
    if (filterDto.statusId) {
      whereCondition.statusId = filterDto.statusId;
    }
    if (filterDto.categoryId) {
      whereCondition.categoryId = filterDto.categoryId;
    }
    if (filterDto.priorityId) {
      whereCondition.priorityId = filterDto.priorityId;
    }

    return this.ticketRepository.findOne({
      where: whereCondition,
      relations: ['assignedToManager', 'assignedToExecutive', 'createdBy', 'createdFor', 'category', 'status', 'priority', 'comments'],
      order: { createdAt: 'DESC' },
    });
  }

  private async publishStatusChangeEvent(
    ticket: Ticket,
    oldStatus: string,
    newStatus: string,
    comment?: string,
  ): Promise<void> {
    try {
      // Get the ticket with all relations
      const fullTicket = await this.ticketRepository.findOne({
        where: { id: ticket.id },
        relations: ['createdBy', 'createdFor', 'assignedToManager', 'assignedToExecutive ', 'status'],
      });

      if (!fullTicket || !fullTicket.createdBy) {
        return;
      }

      const notificationRule = await this.notificationRuleRepository.findOne({
        where: {
          event: TicketEvent.STATUS_CHANGE,
        },
      });
      if (notificationRule) {
      await this.rabbitMQService.publishTicketStatusChange({
        ticketId: fullTicket.id,
        ticketNumber: fullTicket.ticketNumber,
        oldStatus,
        newStatus,
        comment,
        event: TicketEvent.STATUS_CHANGE,
        });
      }
    } catch (error) {
      // Log error but don't throw - notification failure shouldn't break ticket update
      console.error('Failed to publish status change event:', error);
    }
  }

  async getTicketHistories(
    filters: {
      ticketId?: string;
      ticketNumber?: string;
      assignedTo?: string;
      changeType?: ChangeType;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination: {
      page: number;
      limit: number;
      sortBy?: string;
      order?: 'ASC' | 'DESC';
    },
    userId: string, userRoleKeys: string[]
  ) {
    const { page, limit, sortBy = 'th.created_at', order = 'DESC' } = pagination;
  
    const query = this.ticketHistoryRepository
      .createQueryBuilder('th')
      .leftJoinAndSelect('th.ticket', 'ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.createdFor', 'createdFor')
      .leftJoinAndSelect('ticket.category', 'category')
      .leftJoinAndSelect('ticket.priority', 'priority')
      .leftJoinAndSelect('ticket.status', 'status')
      .leftJoinAndSelect('ticket.assignedToManager', 'assignedToManager')
      .leftJoinAndSelect('ticket.assignedToExecutive', 'assignedToExecutive')
      .leftJoinAndSelect('th.changedBy', 'changedBy')
      .select([
        'ticket.id AS "ticketId"',
        'ticket.ticketNumber AS "ticketNumber"',
        'ticket.createdById AS "createdById"',
        'createdBy.fullName AS "createdByFullName"',
        'ticket.createdForId AS "createdForId"',
        'createdFor.fullName AS "createdForFullName"',
        'category.name AS "categoryName"',
        'priority.name AS "priorityName"',
        'status.name AS "statusName"',
        `
        json_agg(
          json_build_object(
            'changeType', th.changeType,
            'fieldName', th.fieldName,
            'oldValue', th.oldValue,
            'newValue', th.newValue,
            'changedById', changedBy.id,
            'changedByFullName', changedBy.fullName,
            'createdAt', th.created_at
          )
          ORDER BY th.created_at DESC
        ) AS history
        `,
      ])
      .groupBy('ticket.id')
      .addGroupBy('ticket.ticketNumber')
      .addGroupBy('ticket.createdById')
      .addGroupBy('createdBy.full_name')
      .addGroupBy('ticket.createdForId')
      .addGroupBy('createdFor.full_name')
      .addGroupBy('category.name')
      .addGroupBy('priority.name')
      .addGroupBy('status.name')
      .addGroupBy('th.created_at')
  
    // 🔹 Filters from Ticket entity
    if (filters.ticketId) {
      query.andWhere('ticket.id = :ticketId', { ticketId: filters.ticketId });
    }
  
    if (filters.ticketNumber) {
      query.andWhere('ticket.ticketNumber ILIKE :ticketNumber', {
        ticketNumber: `%${filters.ticketNumber}%`,
      });
    }
  
    if (filters.assignedTo && userRoleKeys.includes('super_admin')) {
      query.andWhere('(assignedToManager.id = :assignedTo OR assignedToExecutive.id = :assignedTo)', {
        assignedTo: filters.assignedTo,
      });
    }
  
    // 🔹 Filters from TicketHistory
    if (filters.changeType) {
      query.andWhere('th.changeType = :changeType', {
        changeType: filters.changeType,
      });
    }
  
    if (filters.fromDate && filters.toDate) {
      query.andWhere('th.created_at BETWEEN :from AND :to', {
        from: filters.fromDate,
        to: filters.toDate,
      });
    }
  
    // 🔹 Role-based restriction
    if (userRoleKeys.includes('manager')) {
      query.andWhere('assignedToManager.id = :userId', { userId });
    } else if (userRoleKeys.includes('it_executive')) {
      query.andWhere('assignedToExecutive.id = :userId', { userId });
    }
  
    query
      .orderBy(sortBy, order)
      .skip((page - 1) * limit)
      .take(limit);
      
    const data = await query.getRawMany();
  
    return {
      data,
      meta: {
        page,
        limit,
        total: data.length,
      },
    };
  }
  
  async assignTicketToManagerHimself(assignTicketDto: AssignTicketDto, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: assignTicketDto.ticketId },
      relations: ['category', 'assignedToManager', 'status'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: assignTicketDto.userId },
      relations: ['roles', 'departments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify user is an IT Manager
    const isManager = user.roles?.some((role) => role.key === 'manager');
    if (!isManager) {
      throw new BadRequestException('Can only assign tickets to Managers');
    }

    // Verify ticket category matches IT Manager's categories
    if (ticket.departmentId) {
      const hasDepartment = user.departments?.some(
        (d) => d.id === ticket.departmentId,
      );
      if (!hasDepartment) {
        throw new BadRequestException('Ticket department does not match any of the IT Manager\'s assigned departments');
      }
    }

    const oldAssignedToManager = ticket.assignedToManager;

    // Update ticket assigned to manager
    ticket.assignedToManager = user;
    ticket.assignedToManagerId = user.id;

    const oldStatus = ticket.status;
    const status = await this.statusRepository.findOne({ where: { name: 'Assigned' } });
    if (status) {
      ticket.status = status;
      ticket.statusId = status.id;
    }
    
    const savedTicket = await this.ticketRepository.save(ticket);
    const notificationRule = await this.notificationRuleRepository.findOne({
      where: {
        event: TicketEvent.ASSIGN,
      },
    });
    if (notificationRule) {
      try {
        await this.rabbitMQService.publishTicketStatusChange({
          ticketId: savedTicket.id,
          ticketNumber: savedTicket.ticketNumber,
          oldStatus: oldStatus.name,
          newStatus: status.name,
          comment: 'Ticket assigned to IT Manager',
          event: TicketEvent.ASSIGN,
        });
      } catch (error) {
        console.error('Failed to publish status change event:', error);
      }
    }

    const changedBy = await this.userRepository.findOne({ where: { id: userId } });

    // Create ticket history entry for ticket creation
    const assignedHistory = this.ticketHistoryRepository.create({
      ticketId: savedTicket.id,
      ticket: savedTicket,
      changedById: userId,
      changedBy,
      changeType: ChangeType.ASSIGNED,
      fieldName: 'assignedToManager',
      oldValue: oldAssignedToManager?.fullName,
      newValue: savedTicket.assignedToManager?.fullName,
    });
    await this.ticketHistoryRepository.save(assignedHistory);
    return savedTicket;
  }

  async assignTicketToITExecutive(assignTicketDto: AssignTicketDto, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: assignTicketDto.ticketId },
      relations: ['category', 'assignedToExecutive', 'status'],
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

    // Verify user is an IT Executive
    const isITExecutive = user.roles?.some((role) => role.key === 'it_executive');
    if (!isITExecutive) {
      throw new BadRequestException('Can only assign tickets to IT Executives');
    }

    // Verify ticket department matches IT Executive's departments
    // if (ticket.categoryId) {
    //   const hasCategory = user.userCategories?.some(
    //     (uc) => uc.category.id === ticket.categoryId,
    //   );
    //   if (!hasCategory) {
    //     throw new BadRequestException('Ticket category does not match any of the IT Executive\'s assigned categories');
    //   }
    // }

    const oldAssignedToExecutive = ticket.assignedToExecutive;

    // Update ticket assigned to executive
    ticket.assignedToExecutive = user;
    ticket.assignedToExecutiveId = user.id;

    const oldStatus = ticket.status;
    const status = await this.statusRepository.findOne({ where: { name: 'Assigned' } });
    if (status) {
      ticket.status = status;
      ticket.statusId = status.id;
    }
    
    const savedTicket = await this.ticketRepository.save(ticket);
    const notificationRule = await this.notificationRuleRepository.findOne({
      where: {
        event: TicketEvent.ASSIGN,
      },
    });
    if (notificationRule) {
      try {
        await this.rabbitMQService.publishTicketStatusChange({
          ticketId: savedTicket.id,
          ticketNumber: savedTicket.ticketNumber,
          oldStatus: oldStatus.name,
          newStatus: status.name,
          comment: 'Ticket assigned to IT Executive',
          event: TicketEvent.ASSIGN,
        });
      } catch (error) {
        console.error('Failed to publish status change event:', error);
      }
    }

    const changedBy = await this.userRepository.findOne({ where: { id: userId } });

    // Create ticket history entry for ticket creation
    const assignedHistory = this.ticketHistoryRepository.create({
      ticketId: savedTicket.id,
      ticket: savedTicket,
      changedById: userId,
      changedBy,
      changeType: ChangeType.ASSIGNED,
      fieldName: 'assignedToExecutive',
      oldValue: oldAssignedToExecutive?.fullName,
      newValue: savedTicket.assignedToExecutive?.fullName,
    });
    await this.ticketHistoryRepository.save(assignedHistory);
    return savedTicket;
  }
}

