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
import { UserRole } from '../entities/user.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(createTicketDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.ticketsService.findAll(req.user.userId, req.user.role);
  }

  @Get('it-manager')
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_MANAGER)
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
  @Roles(UserRole.EMPLOYEE)
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
    return this.ticketsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_MANAGER, UserRole.EMPLOYEE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.update(
      id,
      updateTicketDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.IT_MANAGER)
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
  @Roles(UserRole.IT_MANAGER)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.ticketsService.remove(id, req.user.userId, req.user.role);
  }
}

