import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AttachmentTarget, Role } from '@prisma/client';

interface Actor { sub: string; role: Role; clientId?: string | null }

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  async presign(params: {
    targetType: AttachmentTarget; // 'APPOINTMENT' | 'ORDER' | 'BUDGET'
    targetId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }, actor: Actor) {
    // RBAC rápido: valida existência do alvo e permissão do ator
    await this.ensureTargetAccess(params.targetType, params.targetId, actor);

    this.storage.assertImage(params.contentType);
    this.storage.assertSize(params.sizeBytes);

    const key = this.storage.buildKey(params.targetType, params.targetId, params.filename);
    return this.storage.presignPut(key, params.contentType);
  }

  async register(params: {
    targetType: AttachmentTarget;
    targetId: string;
    key: string; // retornado no presign
    url: string; // público (CloudFront/s3)
    filename: string;
    contentType: string;
    sizeBytes?: number;
  }, actor: Actor) {
    await this.ensureTargetAccess(params.targetType, params.targetId, actor);

    return this.prisma.attachment.create({
      data: {
        targetType: params.targetType,
        targetId: params.targetId,
        url: params.url,
        filename: params.filename,
        contentType: params.contentType,
        sizeBytes: params.sizeBytes ?? null,
      },
    });
  }

  private async ensureTargetAccess(targetType: AttachmentTarget, targetId: string, actor: Actor) {
    // Checa se o alvo existe e se o ator pode mexer.
    if (targetType === 'APPOINTMENT') {
      const a = await this.prisma.appointment.findUnique({ where: { id: targetId } });
      if (!a) throw new NotFoundException('Appointment não encontrado');
      // CLIENTE só pode ver; upload: ADMIN/COLAB
      if (actor.role === 'CLIENTE') throw new NotFoundException(); // ou Forbidden
    } else if (targetType === 'ORDER') {
      const o = await this.prisma.serviceOrder.findUnique({ where: { id: targetId } });
      if (!o) throw new NotFoundException('OS não encontrada');
      if (actor.role === 'CLIENTE') throw new NotFoundException();
    } else if (targetType === 'BUDGET') {
      const b = await this.prisma.budget.findUnique({ where: { id: targetId } });
      if (!b) throw new NotFoundException('Orçamento não encontrado');
      if (actor.role === 'CLIENTE') throw new NotFoundException();
    }
  }
}
