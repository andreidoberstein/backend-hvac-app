import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateBudgetFromOrderDto } from './dto/budget.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  // POST /orders/:id/budgets → cria orçamento vinculado à OS
  @Post(':id/budgets')
  @Roles(Role.ADMIN, Role.COLABORADOR)
  createFromOrder(
    @Param('id') orderId: string,
    @Body() body: CreateBudgetFromOrderDto,
    @Req() req: any,
  ) {
    return this.budgets.createFromOrder(orderId, body, req.user);
  }
}
