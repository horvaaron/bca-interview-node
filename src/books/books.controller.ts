import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Book } from './books.entity';
import { BooksService } from './books.service';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Patch('update-all-with-year')
  updateAllWithYear(): Promise<Book[]> {
    return this.booksService.updateAllWithYear();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(+id);
  }

  @Get('query/:country')
  query(@Param('country') country: string, @Query('from') from: number) {
    return this.booksService.findBookByCountry(country, from);
  }
}
