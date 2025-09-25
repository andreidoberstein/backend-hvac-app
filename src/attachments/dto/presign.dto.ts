// src/attachments/dto/presign.dto.ts
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { AttachmentTarget } from '@prisma/client';

export class PresignDto {
  @IsEnum(AttachmentTarget)
  targetType!: AttachmentTarget; // 'APPOINTMENT' | 'ORDER' | 'BUDGET'

  @IsUUID()
  targetId!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @Matches(/^image\/(jpeg|png|webp|gif|heic)$/i, { message: 'contentType inválido' })
  contentType!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;
}
