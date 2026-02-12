import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class FilterTicketsDto {
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  priorityId?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
