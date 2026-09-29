import { IsBoolean, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from '../../common/validation.js';
import { Role } from '../../generated/prisma/client.js';

export class UpdateUserDto {
  @Optional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @Optional()
  @IsEnum(Role)
  role?: Role;

  @Optional()
  @IsBoolean()
  isActive?: boolean;

  @Optional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
