import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Comment } from '../entities/comment.entity';
import { TicketHistory, ChangeType } from '../entities/ticket-history.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UserRole } from '../entities/user.entity';

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
  ) {}

  private generateTicketNumber(): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(createTicketDto: CreateTicketDto, userId: string): Promise<Ticket> {
    const createdBy = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!createdBy) {
      throw new NotFoundException('User not found');
    }

    const ticketNumber = this.generateTicketNumber();
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      ticketNumber,
      createdById: userId,
      createdBy,
      assignedToId: createTicketDto.assignedToId || null,
      status: createTicketDto.status || TicketStatus.NEW,
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
      relations: ['assignedTo', 'createdBy', 'history'],
    });
  }

  async findAll(userId: string, userRole: UserRole): Promise<Ticket[]> {
    if (userRole === UserRole.IT_MANAGER) {
      return this.ticketRepository.find({
        relations: ['assignedTo', 'createdBy'],
        order: { createdAt: 'DESC' },
      });
    } else {
      return this.ticketRepository.find({
        where: [{ assignedToId: userId }, { createdById: userId }],
        relations: ['assignedTo', 'createdBy'],
        order: { createdAt: 'DESC' },
      });
    }
  }

  async findOne(id: string, userId: string, userRole: UserRole): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['assignedTo', 'createdBy'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (
      userRole === UserRole.EMPLOYEE &&
      ticket.assignedToId !== userId &&
      ticket.createdById !== userId
    ) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return ticket;
  }

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, userId, userRole);
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

    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      // Create history entry for status change
      const statusHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: ticket.status,
        newValue: updateTicketDto.status,
      });
      historyEntries.push(statusHistory);

      ticket.status = updateTicketDto.status;

      if (updateTicketDto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }

      if (updateTicketDto.status === TicketStatus.CLOSED && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }
    }

    if (updateTicketDto.priority && updateTicketDto.priority !== ticket.priority) {
      // Create history entry for priority change
      const priorityHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.PRIORITY_CHANGED,
        fieldName: 'priority',
        oldValue: ticket.priority,
        newValue: updateTicketDto.priority,
      });
      historyEntries.push(priorityHistory);
    }

    if (updateTicketDto.category && updateTicketDto.category !== ticket.category) {
      // Create history entry for category change
      const categoryHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: userId,
        changedBy: user,
        changeType: ChangeType.UPDATED,
        fieldName: 'category',
        oldValue: ticket.category,
        newValue: updateTicketDto.category,
      });
      historyEntries.push(categoryHistory);
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

    // Update ticket with all changes
    Object.assign(ticket, {
      ...updateTicketDto,
      assignedToId: ticket.assignedToId,
      slaResponseDue: ticket.slaResponseDue,
      slaResolutionDue: ticket.slaResolutionDue,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Save all history entries
    if (historyEntries.length > 0) {
      await this.ticketHistoryRepository.save(historyEntries);
    }

    // Return ticket with relations including history
    return this.ticketRepository.findOne({
      where: { id: savedTicket.id },
      relations: ['assignedTo', 'createdBy', 'history'],
    });
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    if (userRole !== UserRole.IT_MANAGER) {
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
      relations: ['assignedTo', 'createdBy'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldStatus = ticket.status;
    const newStatus = updateStatusDto.status;

    // Update ticket status
    ticket.status = newStatus;

    // Set resolved_at or closed_at if applicable
    if (newStatus === TicketStatus.RESOLVED && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (newStatus === TicketStatus.CLOSED && !ticket.closedAt) {
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
    if (oldStatus !== newStatus) {
      const statusHistory = this.ticketHistoryRepository.create({
        ticketId: ticket.id,
        ticket,
        changedById: user.id,
        changedBy: user,
        changeType: ChangeType.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
      });
      await this.ticketHistoryRepository.save(statusHistory);
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
      relations: ['assignedTo', 'createdBy', 'comments', 'history'],
    });
  }
}

