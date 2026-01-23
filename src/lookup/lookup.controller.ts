import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { ChangeType } from 'src/entities/ticket-history.entity';

@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('categories')
  getCategories(@Query('departmentId', new ParseUUIDPipe({ optional: true })) departmentId?: string) {
    return this.lookupService.findAllCategories(departmentId);
  }

  @Get('statuses')
  getStatuses() {
    return this.lookupService.findAllStatuses();
  }

  @Get('priorities')
  getPriorities() {
    return this.lookupService.findAllPriorities();
  }

  @Get('roles')
  getRoles() {
    return this.lookupService.findAllRoles();
  }

  @Get('departments')
  getDepartments() {
    return this.lookupService.findAllDepartments();
  }

  @Get('change-types')
  getChangeTypes() {
    return {
      data: Object.values(ChangeType),
    };  
  }
}
