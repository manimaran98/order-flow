import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/client.js';
import type { PublicUser } from '../users/user.select.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): PublicUser => ctx.switchToHttp().getRequest().user,
);
