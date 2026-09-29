import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.validation.js';
import { CustomersModule } from './customers/customers.module.js';
import { HealthController } from './health/health.controller.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './products/products.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
