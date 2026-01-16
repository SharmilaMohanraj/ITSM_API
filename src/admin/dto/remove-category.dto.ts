import { IsUUID } from 'class-validator';

export class RemoveCategoryDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  categoryId: string;
}
