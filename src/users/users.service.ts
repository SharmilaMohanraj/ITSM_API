import { Injectable, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUsersDto } from 'src/admin/dto/filter-users.dto';
import { Department } from 'src/entities/department.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
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
    const hasManagerRole = requestedRoles.some((role) => role.key === 'manager');
    const hasITExecutiveRole = requestedRoles.some((role) => role.key === 'it_executive');
    const hasSuperAdminRole = requestedRoles.some((role) => role.key === 'super_admin');
    const isSuperAdmin = createdByRoleKeys?.includes('super_admin') ?? false;

    if ((hasManagerRole || hasITExecutiveRole || hasSuperAdminRole) && !isSuperAdmin) {
      throw new ForbiddenException('Only super admins can create Managers, IT Executives or Super Admins');
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
    if (hasManagerRole || hasITExecutiveRole) {
      const employeeRole = await this.roleRepository.findOne({
        where: { key: 'employee' },
      });
      if (employeeRole && !requestedRoles.some((r) => r.id === employeeRole.id)) {
        finalRoles = [...requestedRoles, employeeRole];
      }
    }

    let departments: Department[] = [];
    if (createUserDto.departmentIds) {
      departments = await this.departmentRepository.find({
        where: { id: In(createUserDto.departmentIds) },
      });
      if (departments.length !== createUserDto.departmentIds.length) {
        throw new BadRequestException('One or more department IDs are invalid');
      }
    }
    
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const { password, roleIds, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      passwordHash: hashedPassword,
      roles: finalRoles,
      departments: departments,
    });

    return this.userRepository.save(user);
  }

  async findAll(query: FilterUsersDto): Promise<any> {
    const { roleId, departmentId, categoryId, search, page, limit } = query;
    const whereConditions: FindOptionsWhere<User>[] = [];
    if (roleId) {
      whereConditions.push({ roles: { id: roleId } });
    }
    if (departmentId) {
      whereConditions.push({ departments: { id: departmentId } });
    }
    if (categoryId) {
      whereConditions.push({ userCategories: { categoryId: categoryId } });
    }
    if (search) {
      whereConditions.push({ fullName: Like(`%${search}%`) });
    }
    const [users, total] = await this.userRepository.findAndCount({
      where: whereConditions,
      relations: ['roles', 'departments', 'userCategories', 'userCategories.category'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: users,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string, userId: string, userRoleKeys: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'fullName',
        'teamId',
        'departments',
        'skills',
        'isAvailable',
        'createdAt',
      ],
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // IT Manager, IT Executive or Super Admin can access any user, regular users can only access their own profile
    const allowedRoles = userRoleKeys.includes('manager') || userRoleKeys.includes('it_executive') || userRoleKeys.includes('super_admin');
    if (!allowedRoles) {
      throw new ForbiddenException('You are not authorized to access this resource');
    }
    return user;
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

