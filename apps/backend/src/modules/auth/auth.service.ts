import { Injectable, UnauthorizedException } from '@nestjs/common';

import argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma/client';
import { UserService } from '../user/user.service';
import { JWT_PAYLOAD } from './types/user-auth.type';
import { ISODateString, LoginCredentialsDto, TimeZoneType } from '@sahibalquran/shared';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService
  ) {}

  async login(loginDTO: LoginCredentialsDto) {
    const foundUser = await this.userService.findByPhone(loginDTO.phone);

    if (!foundUser) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await this.verifyPassword(loginDTO.password, foundUser.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateJwtToken(foundUser.id);

    return {
      accessToken,
      user: {
        id: foundUser.id,
        phone: foundUser.phone,
        name: foundUser.name,
        role: foundUser.role,
        timezone: foundUser.timezone as TimeZoneType,
        createdAt: foundUser.createdAt.toISOString() as ISODateString,
        updatedAt: foundUser.updatedAt.toISOString() as ISODateString,
      },
    };
  }

  private hashPassword(password: string) {
    return argon.hash(password);
  }

  private verifyPassword(password: string, hashedPassword: string) {
    return argon.verify(hashedPassword, password);
  }

  private generateJwtToken(userId: User['id']) {
    return this.jwtService.sign<JWT_PAYLOAD>(
      { sub: userId },
      {
        expiresIn: '30d',
      }
    );
  }
}
