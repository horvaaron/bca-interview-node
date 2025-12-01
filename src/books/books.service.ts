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
    if (!books.length) {
      throw new NotFoundException(`No books in database`);
    }

    const upDatePromises = books.map(async (book) => {
      try {
        const workId = book.workId;

        return await this.openLibraryClientService
          .getBookDetails(workId)
          .then(async (bookDetail) => {
            const firstPublishDate = bookDetail.data.first_publish_date;
            if (!firstPublishDate) return;
            const firstPublishYear = new Date(firstPublishDate).getFullYear();
            if (Number.isNaN(firstPublishYear)) return;

            book.year = firstPublishYear;
            await book.save();
            return book;
          });
      } catch (error) {
        console.error(`Book ${book.id} have not been updated: `, error);
      }
    });

    const results = await Promise.all(upDatePromises);
    return results.filter(Boolean) as Book[];
  }

  async findBookByCountry(country: string, from?: number): Promise<Book[]> {
    const query = this.bookRepository
      .createQueryBuilder('book')
      .leftJoin('book.authors', 'author')
      .where('author.country = :country', { country })
      .orderBy('book.year', 'ASC');

    if (from !== undefined) {
      query.andWhere('book.year <= :from', { from });
    }

    const books = await query.getMany();
    if (books.length === 0) {
      throw new NotFoundException(`No matching books found`);
    }

    return books;
  }
}
