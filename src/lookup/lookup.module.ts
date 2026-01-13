import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketCategory } from '../entities/ticket-category.entity';
import { TicketStatus } from '../entities/ticket-status.entity';
import { TicketPriority } from '../entities/ticket-priority.entity';
import { LookupService } from './lookup.service';
import { LookupController } from './lookup.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketCategory, TicketStatus, TicketPriority]),
  ],
  controllers: [LookupController],
  providers: [LookupService],
  exports: [LookupService],
})
export class LookupModule {}
