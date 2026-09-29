import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { PaginationQueryDto } from '../common/pagination.js';
import type { PublicUser } from '../users/user.select.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() q: PaginationQueryDto) {
    return this.inventory.list(q);
  }

  @Get('low-stock')
  lowStock() {
    return this.inventory.lowStock();
  }

  @Get(':productId')
  ledger(@Param('productId', ParseUUIDPipe) productId: string, @Query() q: PaginationQueryDto) {
    return this.inventory.ledger(productId, q);
  }

  @Post('adjustments')
  @Roles('ADMIN')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: PublicUser) {
    return this.inventory.adjust(dto, user.id);
  }
}
