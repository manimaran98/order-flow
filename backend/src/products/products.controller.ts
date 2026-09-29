import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { PublicUser } from '../users/user.select.js';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() q: ListProductsQuery) {
    return this.products.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: PublicUser) {
    return this.products.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.deactivate(id);
  }
}
