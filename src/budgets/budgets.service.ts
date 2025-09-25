import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, BudgetStatus } from '@prisma/client';

interface Actor { sub: string; role: Role; clientId?: string | null }

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  private ensureActor(actor: Actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'COLABORADOR') {
      throw new ForbiddenException();
    }
  }

  async createFromOrder(
    orderId: string,
    data: {
      amount: number;
      expiresAt?: string
    },
    actor: Actor
  ) {
    this.ensureActor(actor);

    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true },
    });
    if (!order) throw new NotFoundException('OS não encontrada');

    return this.prisma.budget.create({
      data: {
        serviceOrder: { connect: { id: order.id } },
        client: { connect: { id: order.clientId } },
        amount: new Prisma.Decimal(data.amount),
        currency: 'BRL',
        status: BudgetStatus.DRAFT,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    // const budget = await this.prisma.budget.create({
    //   data: {
    //     serviceOrder: { connect: { id: orderId } },
    //     amount: new Prisma.Decimal(data.amount),
    //     currency: 'BRL',
    //     status: 'DRAFT',
    //     expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    //   },
    // });
    //
    // // TODO: notificar cliente (event: BUDGET_CREATED) se desejar
    // return budget;
  }
}
