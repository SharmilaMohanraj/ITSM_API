import { IsUUID, IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsUUID()
  statusId: string;

  @IsString()
  comment: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

