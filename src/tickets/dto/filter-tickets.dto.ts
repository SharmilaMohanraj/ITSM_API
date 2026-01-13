import { IsOptional, IsUUID } from 'class-validator';

export class FilterTicketsDto {
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  priorityId?: string;
}
