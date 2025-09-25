import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';

interface Actor { sub: string; role: Role; clientId?: string | null }

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  private ensureActor(actor: Actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'COLABORADOR') {
      throw new ForbiddenException();
    }
  }

  private async generateCodeWithRetry(): Promise<string> {
    const year = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      const n = Math.floor(10000 + Math.random() * 90000); // 5 dígitos
      const code = `OS-${year}-${n}`;
      // checa se já existe
      const exists = await this.prisma.serviceOrder.findUnique({ where: { code } });
      if (!exists) return code;
    }
    // fallback (praticamente impossível cair aqui)
    return `OS-${year}-${Date.now()}`;
  }

  async createFromAppointment(appointmentId: string, description: string | undefined, actor: Actor) {
    this.ensureActor(actor);

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { serviceOrders: true },
    });
    if (!appt) throw new NotFoundException('Agendamento não encontrado');

    // política v0.1: 1 OS por agendamento
    if (appt.serviceOrders?.length) {
      throw new ConflictException('Já existe uma OS para este agendamento');
    }

    const code = await this.generateCodeWithRetry();

    const order = await this.prisma.serviceOrder.create({
      data: {
        code,
        appointment: { connect: { id: appt.id } },
        client: { connect: { id: appt.clientId } },
        description: description ?? appt.description ?? 'OS gerada a partir do agendamento',
        status: 'OPEN',
        createdBy: { connect: { id: actor.sub } },
      },
    });

    // TODO: notificar cliente (event: ORDER_CREATED) se desejar
    return order;
  }
}
