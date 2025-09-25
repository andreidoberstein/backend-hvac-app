// src/attachments/dto/register.dto.ts
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { AttachmentTarget } from '@prisma/client';

export class RegisterDto {
  @IsEnum(AttachmentTarget)
  targetType!: AttachmentTarget;

  @IsUUID()
  targetId!: string;

  @IsString()
  key!: string;

  @IsString()
  url!: string;

  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeBytes?: number;
}
