import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { password, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'fullName',
        'role',
        'teamId',
        'skills',
        'isAvailable',
        'createdAt',
      ],
    });
  }

  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'fullName',
        'role',
        'teamId',
        'skills',
        'isAvailable',
        'createdAt',
      ],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }
}

