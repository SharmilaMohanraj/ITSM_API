import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Department } from 'src/entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Department])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

