import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/auth/public.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RefreshJwtGuard } from '../common/auth/refresh-jwt.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    return this.auth.login(res, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    return this.auth.logout(res, user?.sub);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refresh(
    @CurrentUser() u: any,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response) {
    const refreshToken =
      (req as any).refreshToken ??
      (req.cookies ? req.cookies['refresh_token'] : undefined);
    return this.auth.refresh(res, req.user, refreshToken as string);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() u: any) {
    return u;
  }
}