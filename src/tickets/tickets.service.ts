import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
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

    // Validate category, priority, and status
    const category = await this.categoryRepository.findOne({
      where: { id: createTicketDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
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

    const ticketNumber = this.generateTicketNumber(category);
    const ticket = this.ticketRepository.create({
      title: createTicketDto.title,
      description: createTicketDto.description,
      ticketNumber,
      createdById: userId,
      createdBy,
      assignedToId: createTicketDto.assignedToId || null,
      categoryId: createTicketDto.categoryId,
      category,
      priorityId: priority?.id || null,
      priority,
      statusId: status?.id || null,
      status,
      conversationContext: createTicketDto.conversationContext,
      summary: createTicketDto.summary,
      slaResponseBreached: false,
      slaResolutionBreached: false,
    });

    if (createTicketDto.assignedToId) {
      const assignedUser = await this.userRepository.findOne({
        where: { id: createTicketDto.assignedToId },
      });
      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found');
      }
      ticket.assignedTo = assignedUser;
    }

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

    // Return ticket with relations including history
    return this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority', 'history'],
    });
  }

  async findAll(userId: string, userRoleKeys: string[]): Promise<Ticket[]> {
    const isITManager = userRoleKeys.includes('it_manager');
    if (isITManager) {
      return this.ticketRepository.find({
        relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
        order: { createdAt: 'DESC' },
      });
    } else {
      return this.ticketRepository.find({
        where: [{ assignedToId: userId }, { createdById: userId }],
        relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
        order: { createdAt: 'DESC' },
      });
    }
  }

  async findOne(id: string, userId: string, userRoleKeys: string[]): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isITManager = userRoleKeys.includes('it_manager');
    if (!(ticket.createdById === userId || (isITManager && ticket.assignedToId === userId))) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async findOneByNumber(ticketNumber: string, userId: string, userRoleKeys: string[]): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { ticketNumber },
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const isITManager = userRoleKeys.includes('it_manager');
    if (!(ticket.createdById === userId || (isITManager && ticket.assignedToId === userId))) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    return ticket;
  }

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    userId: string,
    userRoleKeys: string[],
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, userId, userRoleKeys);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const historyEntries: TicketHistory[] = [];

    if (updateTicketDto.assignedToId && updateTicketDto.assignedToId !== ticket.assignedToId) {
      const assignedUser = await this.userRepository.findOne({
        where: { id: updateTicketDto.assignedToId },
      });
      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found');
      }
      
      // Create history entry for assignment change
      const assignHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.ASSIGNED,
        fieldName: 'assigned_to',
        oldValue: ticket.assignedToId || 'Unassigned',
        newValue: updateTicketDto.assignedToId,
      });
      historyEntries.push(assignHistory);

      ticket.assignedTo = assignedUser;
      ticket.assignedToId = updateTicketDto.assignedToId;
    }

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
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority', 'history'],
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
    const isITManager = userRoleKeys.includes('it_manager');
    if (!isITManager) {
      throw new ForbiddenException('Only IT managers can delete tickets');
    }

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
      relations: ['assignedTo', 'createdBy', 'status'],
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
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority', 'comments', 'history'],
    });
  }

  async findAllForITManager(
    userId: string,
    filterDto: FilterTicketsDto,
  ): Promise<Ticket[]> {
    const whereConditions: FindOptionsWhere<Ticket>[] = [
      { assignedToId: userId },
      { assignedToId: null },
    ];

    // Apply filters if provided
    const baseConditions = whereConditions.map((condition) => {
      const filteredCondition = { ...condition };
      if (filterDto.statusId) {
        filteredCondition.statusId = filterDto.statusId;
      }
      if (filterDto.categoryId) {
        filteredCondition.categoryId = filterDto.categoryId;
      }
      if (filterDto.priorityId) {
        filteredCondition.priorityId = filterDto.priorityId;
      }
      return filteredCondition;
    });

    return this.ticketRepository.find({
      where: baseConditions,
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
      order: { createdAt: 'DESC' },
    });
  }

  async findLastRaisedTicketForEmployee(
    userId: string,
    filterDto: FilterTicketsDto,
  ): Promise<Ticket | null> {
    const whereCondition: FindOptionsWhere<Ticket> = {
      createdById: userId,
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
      relations: ['assignedTo', 'createdBy', 'category', 'status', 'priority'],
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
        relations: ['createdBy', 'assignedTo', 'status'],
      });

      if (!fullTicket || !fullTicket.createdBy) {
        return;
      }

      // Determine which user to notify (prefer assigned user, fallback to creator)
      const userToNotify = fullTicket.assignedTo || fullTicket.createdBy;

      await this.rabbitMQService.publishTicketStatusChange({
        userId: userToNotify.id,
        userEmail: userToNotify.email,
        userName: userToNotify.fullName,
        ticketId: fullTicket.id,
        ticketNumber: fullTicket.ticketNumber,
        oldStatus,
        newStatus,
        comment,
      });
    } catch (error) {
      // Log error but don't throw - notification failure shouldn't break ticket update
      console.error('Failed to publish status change event:', error);
    }
  }
}

