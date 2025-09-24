import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsUUID() clientId: string;
  @IsUUID() collaboratorId: string;
  @IsOptional() @IsUUID() serviceTypeId?: string;
  @IsOptional() @IsUUID() vehicleId?: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startAt: string;
  @IsOptional() @IsDateString() endAt?: string;

// endereço snapshot
  @IsString() addressStreet: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressDistrict?: string;
  @IsString() addressCity: string;
  @IsString() addressState: string;
  @IsString() addressZip: string;
  @IsOptional() @IsString() addressComplement?: string;
}