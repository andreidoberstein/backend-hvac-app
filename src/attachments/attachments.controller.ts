import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Role } from '@prisma/client';
import { PresignDto } from './dto/presign.dto';
import { RegisterDto } from './dto/register.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post('presign')
  @Roles(Role.ADMIN, Role.COLABORADOR)
  presign(@Body() dto: PresignDto, @Req() req: any) {
    return this.service.presign(dto, req.user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.COLABORADOR)
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.service.register(dto, req.user);
  }
}
