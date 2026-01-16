import { Controller, Get } from '@nestjs/common';
import { LookupService } from './lookup.service';

@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('categories')
  getCategories() {
    return this.lookupService.findAllCategories();
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
}
