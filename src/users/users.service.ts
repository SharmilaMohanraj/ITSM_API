import { Injectable, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto, createdByRoleKeys?: string[]): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Fetch roles by IDs
    const requestedRoles = await this.roleRepository.find({
      where: { id: In(createUserDto.roleIds) },
    });
    if (requestedRoles.length !== createUserDto.roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid');
    }

    // Check if trying to create IT Manager or Super Admin - only super admin can do this
    const hasITManagerRole = requestedRoles.some((role) => role.key === 'it_manager');
    const hasSuperAdminRole = requestedRoles.some((role) => role.key === 'super_admin');
    const isSuperAdmin = createdByRoleKeys?.includes('super_admin') ?? false;

    if ((hasITManagerRole || hasSuperAdminRole) && !isSuperAdmin) {
      throw new ForbiddenException('Only super admins can create IT Managers or Super Admins');
    }

    // If public registration (no createdByRoleKeys), only allow employee role
    if (!createdByRoleKeys) {
      const hasOnlyEmployee = requestedRoles.length === 1 && 
        requestedRoles[0].key === 'employee';
      if (!hasOnlyEmployee) {
        throw new ForbiddenException('Public registration can only create employees');
      }
    }

    // If creating IT Manager, automatically add employee role
    let finalRoles = requestedRoles;
    if (hasITManagerRole) {
      const employeeRole = await this.roleRepository.findOne({
        where: { key: 'employee' },
      });
      if (employeeRole && !requestedRoles.some((r) => r.id === employeeRole.id)) {
        finalRoles = [...requestedRoles, employeeRole];
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { password, roleIds, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
      roles: finalRoles,
    });

    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'fullName',
        'teamId',
        'department',
        'skills',
        'isAvailable',
        'createdAt',
      ],
      relations: ['roles'],
    });
  }

  async findOne(id: string, userId: string, userRoleKeys: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'fullName',
        'teamId',
        'department',
        'skills',
        'isAvailable',
        'createdAt',
      ],
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // IT Manager can access any user, regular users can only access their own profile
    const isITManager = userRoleKeys.includes('it_manager');
    if (!isITManager && id !== userId) {
      throw new ForbiddenException('You can only access your own profile');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  // Helper method to check if user has a specific role
  hasRole(user: User, roleKey: string): boolean {
    return user.roles?.some((role) => role.key === roleKey) ?? false;
  }

  // Helper method to get user role keys
  getRoleKeys(user: User): string[] {
    return user.roles?.map((role) => role.key) ?? [];
  }
}

