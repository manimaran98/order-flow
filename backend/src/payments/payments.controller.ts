import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { PublicUser } from '../users/user.select.js';
import { CreatePaymentDto, ListPaymentsQuery } from './dto/payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@Query() q: ListPaymentsQuery) {
    return this.payments.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  @Post()
  record(@Body() dto: CreatePaymentDto, @CurrentUser() user: PublicUser) {
    return this.payments.record(dto, user.id);
  }
}
