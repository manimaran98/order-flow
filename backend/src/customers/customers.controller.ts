import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from './dto/customer.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Query() q: ListCustomersQuery) {
    return this.customers.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id);
  }

  @Get(':id/orders')
  orders(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaginationQueryDto) {
    return this.customers.orders(id, q);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(id);
  }
}
