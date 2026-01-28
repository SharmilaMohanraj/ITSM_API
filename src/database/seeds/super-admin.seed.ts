import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';

interface SuperAdminSeedData {
  email: string;
  password: string;
  fullName: string;
  uniqueKey: string;
} 

const SUPER_ADMINS: SuperAdminSeedData[] = [
  {
    email: 'superadmin@itsm.com',
    password: 'SuperAdmin@123',
    fullName: 'Super Administrator',
    uniqueKey: 'SUPER-USR-1001',
  },
];

export async function seedSuperAdmins(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // Get super_admin role
  const superAdminRole = await roleRepository.findOne({
    where: { key: 'super_admin' },
  });

  if (!superAdminRole) {
    throw new Error('Super admin role not found. Please seed roles first.');
  }

  for (const adminData of SUPER_ADMINS) {
    const existingUser = await userRepository.findOne({
      where: { email: adminData.email },
      relations: ['roles'],
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(adminData.password, 10);
      const user = userRepository.create({
        email: adminData.email,
        passwordHash,
        fullName: adminData.fullName,
        roles: [superAdminRole],
      });

      await userRepository.save(user);
      console.log(`✓ Seeded super admin: ${adminData.email}`);
    } else {
      // Check if user already has super_admin role
      const hasSuperAdminRole = existingUser.roles?.some(
        (role) => role.key === 'super_admin',
      );

      if (!hasSuperAdminRole) {
        existingUser.roles = [...(existingUser.roles || []), superAdminRole];
        await userRepository.save(existingUser);
        console.log(`✓ Added super_admin role to: ${adminData.email}`);
      } else {
        console.log(`⊘ Super admin already exists: ${adminData.email}`);
      }
    }
  }
}
