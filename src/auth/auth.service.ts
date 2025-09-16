import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Response } from 'express';
import type { CookieOptions } from 'express';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function parseDuration(input: string | undefined, defMs: number) {
  if (!input) return defMs;
  const m = input.match(/^(\d+)([smhd])$/i);
  if (!m) return defMs;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  return unit === 's'
    ? n * 1000
    : unit === 'm'
      ? n * 60 * 1000
      : unit === 'h'
        ? n * 60 * 60 * 1000
        : n * 24 * 60 * 60 * 1000;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  private cookieBase(): Omit<CookieOptions, 'maxAge' | 'expires'> {
    const prod = process.env.NODE_ENV === 'production';
    const base: Omit<CookieOptions, 'maxAge' | 'expires'> = {
      httpOnly: true,
      secure: prod, // em localhost http, fica false
      sameSite: prod ? 'none' : 'lax',
      path: '/',
    };
    if (prod && process.env.COOKIE_DOMAIN) {
      base.domain = process.env.COOKIE_DOMAIN;
    }
    return base;
  }

  private signAccess(payload: any) {
    const expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m';
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn,
    });
  }

  private signRefresh(payload: any) {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES || '7d';
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn,
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async login(res: Response, user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId ?? null,
    };

    const [access, refresh] = await Promise.all([
      this.signAccess(payload),
      this.signRefresh(payload),
    ]);

    const accessMs = parseDuration(
      process.env.JWT_ACCESS_EXPIRES,
      15 * 60 * 1000,
    );
    const refreshMs = parseDuration(
      process.env.JWT_REFRESH_EXPIRES,
      7 * 24 * 60 * 60 * 1000,
    );

    const refreshHash = await bcrypt.hash(refresh, 10);
    const refreshExp = new Date(Date.now() + refreshMs);
    await this.users.setRefreshToken(user.id, refreshHash, refreshExp);

    const base = this.cookieBase();

    res.cookie(ACCESS_COOKIE, access, { ...base, maxAge: accessMs });
    res.cookie(REFRESH_COOKIE, refresh, { ...base, maxAge: refreshMs });

    return {
      user: this.users.publicUser(user),
      tokenExpiresAt: new Date(Date.now() + accessMs).toISOString(),
    };
  }

  async refresh(res: Response, payload: any, refreshToken: string) {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException();
    }
    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh expired');
    }
    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh');

    return this.login(res, user);
  }

  async logout(res: Response, userId?: string) {
    if (userId) {
      await this.users.clearRefreshToken(userId);
    }

    const base = this.cookieBase(); // <-- importante

    const clearOpts: Pick<
      CookieOptions,
      'path' | 'domain' | 'secure' | 'sameSite'
    > = {
      path: base.path!,
      domain: base.domain,
      secure: base.secure!,
      sameSite: base.sameSite,
    };

    res.clearCookie(ACCESS_COOKIE, clearOpts);
    res.clearCookie(REFRESH_COOKIE, clearOpts);

    return { success: true };
  }
}
