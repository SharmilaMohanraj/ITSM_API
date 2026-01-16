import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { TicketCategory } from '../entities/ticket-category.entity';
import { UserCategory } from '../entities/user-category.entity';
import { Ticket } from '../entities/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      TicketCategory,
      UserCategory,
      Ticket,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
