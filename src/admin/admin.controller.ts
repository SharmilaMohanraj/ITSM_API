import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddRoleDto } from './dto/add-role.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { AddCategoryDto } from './dto/add-category.dto';
import { RemoveCategoryDto } from './dto/remove-category.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users/roles/add')
  addRoleToUser(@Body() addRoleDto: AddRoleDto) {
    return this.adminService.addRoleToUser(addRoleDto);
  }

  @Delete('users/roles/remove')
  removeRoleFromUser(@Body() removeRoleDto: RemoveRoleDto) {
    return this.adminService.removeRoleFromUser(removeRoleDto);
  }

  @Post('users/categories/add')
  addCategoryToUser(@Body() addCategoryDto: AddCategoryDto) {
    return this.adminService.addCategoryToUser(addCategoryDto);
  }

  @Delete('users/categories/remove')
  removeCategoryFromUser(@Body() removeCategoryDto: RemoveCategoryDto) {
    return this.adminService.removeCategoryFromUser(removeCategoryDto);
  }

  @Get('users')
  findAllUsers(@Query() filterDto: FilterUsersDto) {
    return this.adminService.findAllUsers(filterDto);
  }

  @Post('tickets/assign')
  assignTicketToITManager(@Body() assignTicketDto: AssignTicketDto) {
    return this.adminService.assignTicketToITManager(assignTicketDto);
  }
}
