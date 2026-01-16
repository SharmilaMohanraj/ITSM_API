import { IsOptional, IsUUID, IsString } from 'class-validator';

export class FilterUsersDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
