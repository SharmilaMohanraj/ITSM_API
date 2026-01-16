import { IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsUUID()
  ticketId: string;

  @IsUUID()
  userId: string;
}
