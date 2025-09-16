import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

const refreshExtractor = (req: Request) => req?.cookies?.['refresh_token'] ?? null;

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshExtractor]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || "JWT_ACCESS_SECRET",
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload: any) {
    const token = refreshExtractor(req);
    if (!req?.cookies?.['refresh_token']) throw new UnauthorizedException('No refresh cookie');
    return { sub: payload.sub };
  }
}