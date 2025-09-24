import { IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() street: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() district?: string;
  @IsString() city: string;
  @IsString() state: string;
  @IsString() zip: string;
  @IsOptional() @IsString() complement?: string;
}