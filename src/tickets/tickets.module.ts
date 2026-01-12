import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Comment } from '../entities/comment.entity';
import { TicketHistory } from '../entities/ticket-history.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, User, Comment, TicketHistory])],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

