import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { publicUserSelect, type PublicUser } from '../users/user.select.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword, verifyPassword } from './password.js';

const REGISTER_LOCK = 7_001; // arbitrary advisory-lock key serializing first-user registration

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Only works while there are no users: the first user becomes ADMIN. */
  async register(dto: RegisterDto) {
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${REGISTER_LOCK})`;
      if ((await tx.user.count()) > 0) {
        throw new ForbiddenException('Registration is closed. Ask an admin to create your account.');
      }
      return tx.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash: await hashPassword(dto.password),
          role: 'ADMIN',
        },
        select: publicUserSelect,
      });
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const found = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!found || !found.isActive || !(await verifyPassword(dto.password, found.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { passwordHash: _, ...user } = found;
    return this.issue(user);
  }

  private async issue(user: PublicUser) {
    return { accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }), user };
  }
}
