import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import * as path from 'path';

function extOf(filename: string) {
  const ext = path.extname(filename || '').toLowerCase().replace('.', '');
  return ext || 'bin';
}

@Injectable()
export class StorageService {
  private s3 = new S3Client({ region: process.env.AWS_REGION });
  private bucket = process.env.S3_BUCKET!;
  private maxBytes =
    (Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024) || 10 * 1024 * 1024;

  private publicBase() {
    return process.env.S3_PUBLIC_URL_BASE
      || `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  }

  assertImage(contentType: string) {
    if (!contentType) throw new BadRequestException('ContentType obrigatório');

    if (!/^image\//.test(contentType))
      throw new BadRequestException('Somente imagens são permitidas');
  }

  assertSize(sizeBytes: number) {
    if (sizeBytes > this.maxBytes)
      throw new BadRequestException(`Arquivo acima de ${this.maxBytes} bytes`);
  }

  /**
   * Gera key do objeto: ex. appointments/{id}/{uuid}.ext
   */
  buildKey(targetType: 'APPOINTMENT'|'ORDER'|'BUDGET', targetId: string, filename: string) {
    const ext = extOf(filename);
    return `${targetType.toLowerCase()}s/${targetId}/${randomUUID()}.${ext}`;
  }

  async presignPut(key: string, contentType: string) {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      // ACL: 'private' // default é privado; deixe assim
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 60 * 5 }); // 5min
    const url = `${this.publicBase()}/${key}`;
    return { uploadUrl, key, url };
  }
}
