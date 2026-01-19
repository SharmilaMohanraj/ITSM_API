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

  @Get('it-manager')
  @UseGuards(RolesGuard)
  @Roles('it_manager')
  findAllForITManager(
    @Request() req,
    @Query() filterDto: FilterTicketsDto,
  ) {
    return this.ticketsService.findAllForITManager(
      req.user.userId,
      filterDto,
    );
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
  @Roles('it_manager', 'employee')
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
  @Roles('it_manager')
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
  @Roles('it_manager')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.ticketsService.remove(id, req.user.userId, req.user.roles);
  }
}

