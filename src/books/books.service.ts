import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenLibraryClientService } from '../open-library/open-library-client.service';
import { Book } from './books.entity';

@Injectable()
export class BooksService {
  readonly DEFAULT_RELATIONS = ['authors'];

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly openLibraryClientService: OpenLibraryClientService,
  ) {}

  findAll(): Promise<Book[]> {
    return this.bookRepository.find({ relations: this.DEFAULT_RELATIONS });
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      relations: this.DEFAULT_RELATIONS,
      where: { id },
    });

    if (!book) throw new NotFoundException(`Book with id ${id} not found.`);

    return book;
  }

  async updateAllWithYear(): Promise<Book[]> {
    const books = await this.findAll();
    if (!books.length) throw new NotFoundException(`No books in database`);

    const upDatePromises = books.map(async (book) => {
      const workId = book.workId;
      return await this.openLibraryClientService
        .getBookDetails(workId)
        .then(async (bookDetail) => {
          const firstPublishDate = bookDetail.data.first_publish_date;
          if (!firstPublishDate) return;
          const firstPublishYear = new Date(firstPublishDate).getFullYear();
          if (!firstPublishYear) return;
          // await this.bookRepository.update(book.id, { year: firstPublishYear });
          book.year = firstPublishYear;
          await book.save();
          return book;
        });
    });
    const results = await Promise.all(upDatePromises);
    return results.filter(Boolean) as Book[];
  }
}
