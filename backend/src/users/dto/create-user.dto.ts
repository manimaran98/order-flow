import { IsEnum } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto.js';
import { Role } from '../../generated/prisma/client.js';

export class CreateUserDto extends RegisterDto {
  @IsEnum(Role)
  role: Role;
}
