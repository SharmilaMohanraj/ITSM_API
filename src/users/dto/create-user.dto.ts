import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsObject()
  skills?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

