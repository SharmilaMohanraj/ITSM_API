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

  private getUniqueKeyPrefixFromRoles(roleKeys: string[]): 'EMP-USR' | 'MGR-USR' | 'EXC-USR' | 'ADMIN-USR' {
    // If multiple roles, pick the "highest" one for key generation
    if (roleKeys.includes('super_admin')) return 'ADMIN-USR';
    if (roleKeys.includes('manager')) return 'MGR-USR';
    if (roleKeys.includes('it_executive')) return 'EXC-USR';
    return 'EMP-USR';
  }

  private async generateNextUniqueKey(prefix: string): Promise<string> {
    // Format: PREFIX-<number>, example: EMP-USR-1001
    // Get the max numeric suffix for this prefix and increment.
    const pattern = `${prefix}-%`;

    const raw = await this.userRepository
      .createQueryBuilder('user')
      .select(`MAX(CAST(split_part(user.uniqueKey, '-', 3) AS INTEGER))`, 'max')
      .where('user.uniqueKey LIKE :pattern', { pattern })
      .getRawOne<{ max: string | null }>();

    const maxExisting = raw?.max ? Number(raw.max) : 0;
    const next = Math.max(1000, maxExisting) + 1; // start at 1001 if none
    return `${prefix}-${next}`;
  }

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

    const roleKeys = requestedRoles.map((r) => r.key);
    const prefix = this.getUniqueKeyPrefixFromRoles(roleKeys);

    // Generate uniqueKey with simple retry on collision (unique constraint)
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const uniqueKey = await this.generateNextUniqueKey(prefix);
        const user = this.userRepository.create({
          ...userData,
          passwordHash: hashedPassword,
          roles: requestedRoles,
          departments: departments,
          uniqueKey,
        });
        return await this.userRepository.save(user);
      } catch (err) {
        lastError = err;
        // If collision/race on uniqueKey, retry; otherwise rethrow
        const msg = (err as any)?.message || '';
        const code = (err as any)?.code;
        const isUniqueViolation = code === '23505' || /duplicate key value|unique/i.test(msg);
        if (!isUniqueViolation) throw err;
      }
    }
    throw lastError;
  }

  async findAllITExecutives(query: FilterUsersDto, userId: string, userRoleKeys: string[]): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['departments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userDepartmentIds = user.departments?.map((department) => department.id) || [];
    
    // If user has no departments, return empty result
    if (userDepartmentIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: query.page || 1,
          limit: query.limit || 10,
        },
      };
    }

    const { roleId, departmentId, categoryId, search, page = 1, limit = 10 } = query;
    
    // Validate departmentId if provided - must be one of user's departments
    if (departmentId) {
      if (!userDepartmentIds.includes(departmentId)) {
        throw new ForbiddenException('You can only access departments under your management');
      }
    }

    // Build where condition - always filter by it_executive role
    const whereCondition: FindOptionsWhere<User> = {
      roles: { key: 'it_executive' },
    };

    // Add department filter
    if (departmentId) {
      // Use the provided departmentId (already validated)
      whereCondition.departments = { id: departmentId };
    } else {
      // Automatically filter by user's departments
      whereCondition.departments = { id: In(userDepartmentIds) };
    }

    // Add category filter if provided
    if (categoryId) {
      whereCondition.userCategories = { categoryId: categoryId };
    }

    // Add search filter if provided
    if (search) {
      whereCondition.fullName = Like(`%${search}%`);
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereCondition,
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

