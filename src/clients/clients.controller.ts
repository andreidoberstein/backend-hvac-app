import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '@prisma/client';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClientDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }


  @Get()
  @Roles(Role.ADMIN, Role.COLABORADOR)
  findAll(@Query('page') page?: number, @Query('perPage') perPage?: number, @Query('q') q?: string, @Req() req?: any) {
    return this.service.findAll({ page: Number(page), perPage: Number(perPage), q: q || undefined }, req.user);
  }


  @Get(':id')
  @Roles(Role.ADMIN, Role.COLABORADOR, Role.CLIENTE)
  findOne(@Param('id') id: string, @Req() req: any) { return this.service.findOne(id, req.user); }


  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClientDto, @Req() req: any) { return this.service.update(id, dto, req.user); }


  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) { return this.service.remove(id, req.user); }


// Addresses
  @Post(':id/addresses')
  @Roles(Role.ADMIN)
  addAddress(@Param('id') clientId: string, @Body() dto: CreateAddressDto, @Req() req: any) { return this.service.addAddress(clientId, dto, req.user); }


  @Get(':id/addresses')
  @Roles(Role.ADMIN, Role.COLABORADOR, Role.CLIENTE)
  listAddresses(@Param('id') clientId: string, @Req() req: any) { return this.service.listAddresses(clientId, req.user); }


  @Patch(':id/addresses/:addressId')
  @Roles(Role.ADMIN)
  updateAddress(@Param('id') clientId: string, @Param('addressId') addressId: string, @Body() dto: UpdateAddressDto, @Req() req: any) {
    return this.service.updateAddress(clientId, addressId, dto, req.user);
  }


  @Delete(':id/addresses/:addressId')
  @Roles(Role.ADMIN)
  removeAddress(@Param('id') clientId: string, @Param('addressId') addressId: string, @Req() req: any) {
    return this.service.removeAddress(clientId, addressId, req.user);
  }
}