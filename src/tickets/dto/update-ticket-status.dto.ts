import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { TicketStatus } from '../../entities/ticket.entity';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @IsString()
  comment: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

