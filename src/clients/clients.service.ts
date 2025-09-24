import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

interface Actor { sub: string; role: Role; clientId?: string | null }

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}


  private ensureCanReadList(actor: Actor) {
    if (actor.role === 'CLIENTE') throw new ForbiddenException();
  }


  private ensureCanMutate(actor: Actor) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException();
  }


  async create(dto: CreateClientDto, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.client.create({ data: dto });
  }


  async findAll(params: { page?: number; perPage?: number; q?: string }, actor: Actor) {
    this.ensureCanReadList(actor);
    const page = Number(params.page ?? 1);
    const perPage = Number(params.perPage ?? 20);
    const where: Prisma.ClientWhereInput = params.q
      ? { OR: [ { name: { contains: params.q, mode: 'insensitive' } }, { document: { contains: params.q } } ] }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({ where, skip: (page-1)*perPage, take: perPage, orderBy: { createdAt: 'desc' } }),
      this.prisma.client.count({ where }),
    ]);
    return { data, meta: { page, perPage, total } };
  }


  async findOne(id: string, actor: Actor) {
    if (actor.role === 'CLIENTE' && actor.clientId !== id) throw new ForbiddenException();
    const c = await this.prisma.client.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }


  async update(id: string, dto: UpdateClientDto, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.client.update({ where: { id }, data: dto });
  }


  async remove(id: string, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.client.delete({ where: { id } });
  }


// Addresses
  async addAddress(clientId: string, dto: CreateAddressDto, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.address.create({ data: { ...dto, clientId } });
  }


  async listAddresses(clientId: string, actor: Actor) {
    if (actor.role === 'CLIENTE' && actor.clientId !== clientId) throw new ForbiddenException();
    return this.prisma.address.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  }


  async updateAddress(clientId: string, addressId: string, dto: UpdateAddressDto, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }


  async removeAddress(clientId: string, addressId: string, actor: Actor) {
    this.ensureCanMutate(actor);
    return this.prisma.address.delete({ where: { id: addressId } });
  }
}