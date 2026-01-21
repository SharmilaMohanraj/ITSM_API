import { IsNumber, IsOptional, IsUUID } from 'class-validator';

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
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}
