import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FilterTicketHistoriesDto } from './dto/filter-ticket-histories.dto';
import { AssignTicketDto } from 'src/admin/dto/assign-ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(createTicketDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req, @Query() filterDto: FilterTicketsDto) {
    return this.ticketsService.findAll(req.user.userId, filterDto);
  }

  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles('manager')
  findAllForITManager(
    @Request() req,
    @Query() filterDto: FilterTicketsDto,
  ) {
    return this.ticketsService.findAllForITManager(
      req.user.userId,
      filterDto,
    );
  }

  @Get('it-executive')
  @UseGuards(RolesGuard)
  @Roles('it_executive')
  findAllForITExecutive(
    @Request() req,
    @Query() filterDto: FilterTicketsDto,
  ) {
    return this.ticketsService.findAllForITExecutive(req.user.userId, filterDto);
  }

  @Get('employee')
  @UseGuards(RolesGuard)
  @Roles('employee')
  findLastRaisedTicketForEmployee(
    @Request() req,
    @Query() filterDto: FilterTicketsDto,
  ) {
    return this.ticketsService.findLastRaisedTicketForEmployee(
      req.user.userId,
      filterDto,
    );
  }

  @Get('ticket-histories')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'manager', 'it_executive')
  async getTicketHistories(
    @Request() req,
    @Query() query: FilterTicketHistoriesDto  
  ) {
    return this.ticketsService.getTicketHistories(
      {
        ticketId: query.ticketId,
        ticketNumber: query.ticketNumber,
        assignedTo: query.assignedTo,
        changeType: query.changeType,
        fromDate: query.fromDate,
        toDate: query.toDate,
      },
      {
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy,
        order: query.order,
      },  
      req.user.userId,
      req.user.roles,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.ticketsService.findOne(id, req.user.userId, req.user.roles);
  }

  @Get('number/:ticketNumber')
  findOneByNumber(@Param('ticketNumber') ticketNumber: string, @Request() req) {
    return this.ticketsService.findOneByNumber(ticketNumber, req.user.userId, req.user.roles);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('manager', 'it_executive', 'employee')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.update(
      id,
      updateTicketDto,
      req.user.userId,
      req.user.roles,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('manager', 'it_executive', 'super_admin')
  updateStatusWithComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateTicketStatusDto,
    @Request() req,
  ) {
    return this.ticketsService.updateStatusWithComment(
      id,
      updateStatusDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('manager', 'it_executive', 'super_admin')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.ticketsService.remove(id, req.user.userId, req.user.roles);
  }

  @Post('assign-to-manager')
  @UseGuards(RolesGuard)
  @Roles('manager','super_admin')
  assignToManager(@Body() assignTicketDto: AssignTicketDto, @Request() req) {
    return this.ticketsService.assignTicketToManagerHimself(assignTicketDto, req.user.userId);
  }

  @Post('assign-to-executive')
  @UseGuards(RolesGuard)
  @Roles('manager','super_admin')
  assignToExecutive(@Body() assignTicketDto: AssignTicketDto, @Request() req) {
    return this.ticketsService.assignTicketToITExecutive(assignTicketDto, req.user.userId);
  }
}

