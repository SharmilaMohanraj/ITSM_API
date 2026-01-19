import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from '../users/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const roleKeys = user.roles?.map((role) => role.key) ?? [];
    const payload = { email: user.email, sub: user.id, roles: roleKeys };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleKeys,
      },
    };
  }

  async validateToken(token: string) {
    const decoded = this.jwtService.verify(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    } 
    const user = await this.userRepository.findOne({
      where: { id: decoded.sub },
      relations: ['roles'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const roleKeys = user.roles?.map((role) => role.key) ?? [];
    return {
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleKeys,
      },
    };
  }
}

