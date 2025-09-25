import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '@prisma/client';

class CreateOrderFromAppointmentDto {
  description?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class ServiceOrdersController {
  constructor(private readonly orders: ServiceOrdersService) {}

  // POST /appointments/:id/orders → gera OS a partir do agendamento
  @Post(':id/orders')
  @Roles(Role.ADMIN, Role.COLABORADOR)
  createFromAppointment(
    @Param('id') appointmentId: string,
    @Body() body: CreateOrderFromAppointmentDto,
    @Req() req: any,
  ) {
    return this.orders.createFromAppointment(appointmentId, body?.description, req.user);
  }
}
