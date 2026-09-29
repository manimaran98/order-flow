import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from '../auth/password.js';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { publicUserSelect } from './user.select.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ select: publicUserSelect, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.user.count(),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash: await hashPassword(dto.password),
        role: dto.role,
      },
      select: publicUserSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    if (id === actingUserId && (dto.isActive === false || (dto.role && dto.role !== 'ADMIN'))) {
      throw new BadRequestException('You cannot deactivate or demote yourself');
    }
    await this.findOne(id);
    const { password, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(password && { passwordHash: await hashPassword(password) }) },
      select: publicUserSelect,
    });
  }
}
