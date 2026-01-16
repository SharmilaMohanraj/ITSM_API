import { IsUUID } from 'class-validator';

export class AddCategoryDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  categoryId: string;
}
