import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FindAppointmentQueryDto } from './dto/find-appointment.query';


interface Actor { sub: string; role: Role; clientId?: string | null }


@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}


  private ensureCanCreateOrUpdate(actor: Actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'COLABORADOR') throw new ForbiddenException();
  }


  async create(dto: CreateAppointmentDto, actor: Actor) {
    this.ensureCanCreateOrUpdate(actor);
    const data: Prisma.AppointmentCreateInput = {
      client: { connect: { id: dto.clientId } },
      collaborator: { connect: { id: dto.collaboratorId } },
      serviceType: dto.serviceTypeId ? { connect: { id: dto.serviceTypeId } } : undefined,
      vehicle: dto.vehicleId ? { connect: { id: dto.vehicleId } } : undefined,
      description: dto.description ?? null,
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : null,
      addressStreet: dto.addressStreet,
      addressNumber: dto.addressNumber ?? null,
      addressDistrict: dto.addressDistrict ?? null,
      addressCity: dto.addressCity,
      addressState: dto.addressState,
      addressZip: dto.addressZip,
      addressComplement: dto.addressComplement ?? null,
    } as any;
    const appt = await this.prisma.appointment.create({ data });
// TODO: notifications.onAppointmentEvent({ event: 'APPOINTMENT_CREATED', appointmentId: appt.id })
    return appt;
  }


  async findAll(q: FindAppointmentQueryDto, actor: Actor) {
    const page = Number(q.page ?? 1);
    const perPage = Number(q.perPage ?? 20);


    const where: Prisma.AppointmentWhereInput = {};
    if (actor.role === 'CLIENTE') {
      if (!actor.clientId) throw new ForbiddenException();
      where.clientId = actor.clientId;
    } else {
      if (q.clientId) where.clientId = q.clientId;
      if (q.collaboratorId) where.collaboratorId = q.collaboratorId;
    }
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.startAt = {};
      if (q.from) (where.startAt as any).gte = new Date(q.from);
      if (q.to) (where.startAt as any).lte = new Date(q.to);
    }


    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({ where, skip: (page-1)*perPage, take: perPage, orderBy: { startAt: 'desc' } }),
      this.prisma.appointment.count({ where }),
    ]);
  }

  async findOne(id: string, actor: Actor) {
    const a = await this.prisma.appointment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    if (actor.role === 'CLIENTE' && actor.clientId !== a.clientId) throw new ForbiddenException();
    return a;
  }

  async update(id: string, dto: UpdateAppointmentDto, actor: Actor) {
    this.ensureCanCreateOrUpdate(actor);
    const patch: Prisma.AppointmentUpdateInput = { ...dto } as any;
    if (dto.startAt) (patch as any).startAt = new Date(dto.startAt);
    if (dto.endAt) (patch as any).endAt = new Date(dto.endAt);
    const appt = await this.prisma.appointment.update({ where: { id }, data: patch });
// TODO: notifications.onAppointmentEvent({ event: hasStatusChange ? 'APPOINTMENT_STATUS_CHANGED' : 'APPOINTMENT_UPDATED', appointmentId: id })
    return appt;
  }


  async remove(id: string, actor: Actor) {
// somente ADMIN (ou ajuste para permitir COLABORADOR)
    if (actor.role !== 'ADMIN') throw new ForbiddenException();
    return this.prisma.appointment.delete({ where: { id } });
  }
}