import { IsIn, IsOptional, IsUUID } from "class-validator";
import { ChangeType } from "src/entities/ticket-history.entity";

export class FilterTicketHistoriesDto {
    @IsOptional()
    @IsUUID()
    ticketId: string;

    @IsOptional()
    ticketNumber: string;

    @IsOptional()
    @IsUUID()
    assignedTo: string;
    
    @IsOptional()
    changeType: ChangeType;

    @IsOptional()
    fromDate: Date;

    @IsOptional()
    toDate: Date;

    @IsOptional()
    page: number = 1;

    @IsOptional()
    limit: number = 20;

    @IsOptional()
    sortBy: string;;
    
    @IsOptional()   
    @IsIn(['ASC', 'DESC'])
    order: 'ASC' | 'DESC';
}