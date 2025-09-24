import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FindAppointmentQueryDto } from './dto/find-appointment.query';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '@prisma/client';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}


  @Post()
  @Roles(Role.ADMIN, Role.COLABORADOR)
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }


  @Get()
  @Roles(Role.ADMIN, Role.COLABORADOR, Role.CLIENTE)
  findAll(@Query() q: FindAppointmentQueryDto, @Req() req: any) {
    return this.service.findAll(q, req.user);
  }


  @Get(':id')
  @Roles(Role.ADMIN, Role.COLABORADOR, Role.CLIENTE)
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }


  @Patch(':id')
  @Roles(Role.ADMIN, Role.COLABORADOR)
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }


  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}