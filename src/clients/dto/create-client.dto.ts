import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { ClientType } from '@prisma/client';

export class CreateClientDto {
  @IsEnum(ClientType) type: ClientType; // PF | PJ
  @IsString() name: string;
  @IsString() document: string; // CPF/CNPJ (validação específica no pipe opcional)
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsPhoneNumber('BR') phone?: string;
}