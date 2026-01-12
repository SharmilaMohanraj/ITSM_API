import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
  IsDateString,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../entities/ticket.entity';

export class CreateTicketDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

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

