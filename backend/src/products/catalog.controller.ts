import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { CatalogService } from './catalog.service.js';
import { ListCatalogQuery } from './dto/catalog.dto.js';

/** Customer-facing product catalog: no login, active products, public fields only. */
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  findAll(@Query() q: ListCatalogQuery) {
    return this.catalog.findAll(q);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.findOne(id);
  }
}
