import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  publicUser(u: any) {
    if (!u) return null;
    const { passwordHash, refreshTokenHash, ...rest } = u;
    return rest;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(params: { page?: number; perPage?: number }) {
    const page = Number(params.page ?? 1);
    const perPage = Number(params.perPage ?? 20);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count(),
    ]);
    return { data: data.map(this.publicUser), meta: { page, perPage, total } };
  }

  async setRefreshToken(userId: string, hash: string, expiresAt: Date) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: hash, refreshTokenExpiresAt: expiresAt } });
  }

  async clearRefreshToken(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null, refreshTokenExpiresAt: null } });
  }

  async create(data: { name: string; email: string; password: string; role: string; clientId?: string }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({ data: { name: data.name, email: data.email, passwordHash, role: data.role as any, clientId: data.clientId ?? null } });
  }

  async update(id: string, data: Prisma.UserUpdateInput & { password?: string }) {
    const patch: Prisma.UserUpdateInput = { ...data };
    if ((data as any).password) {
      patch.passwordHash = await bcrypt.hash((data as any).password, 10);
      delete (patch as any).password;
    }
    return this.prisma.user.update({ where: { id }, data: patch });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}