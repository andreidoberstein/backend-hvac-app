import { IsEmail, IsOptional, IsString, MinLength, IsEnum, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsUUID() clientId?: string;
}