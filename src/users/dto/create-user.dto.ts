import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsObject,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  roleIds: string[];

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

