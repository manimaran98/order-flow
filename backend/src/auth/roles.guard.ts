import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../generated/prisma/client.js';
import type { PublicUser } from '../users/user.select.js';
import { ROLES } from './decorators.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: PublicUser }>().user;
    return !!user && roles.includes(user.role);
  }
}
