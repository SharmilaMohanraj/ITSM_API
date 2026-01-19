import {
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  IsDateString,
} from 'class-validator';

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  @IsOptional()
  priorityId: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsObject()
  conversationContext?: Record<string, any>;

  @IsOptional()
  @IsObject()
  summary?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  slaResponseDue?: string;

  @IsOptional()
  @IsDateString()
  slaResolutionDue?: string;
}

