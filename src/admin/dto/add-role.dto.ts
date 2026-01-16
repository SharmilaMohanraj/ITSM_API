import { IsUUID } from 'class-validator';

export class AddRoleDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  roleId: string;
}
