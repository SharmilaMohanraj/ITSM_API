import {
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  IsDateString,
} from 'class-validator';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  priorityId?: string;

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
  @IsDateString()
  slaResponseDue?: string;

  @IsOptional()
  @IsDateString()
  slaResolutionDue?: string;
}

