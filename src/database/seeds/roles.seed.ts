import { DataSource } from 'typeorm';
import { Role } from '../../entities/role.entity';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);

  const roles = [
    {
      key: 'employee',
      name: 'Employee',
      description: 'Regular employee role',
    },
    {
      key: 'manager',
      name: 'IT Manager',
      description: 'IT Manager role with ticket management capabilities',
    },
    {
      key: 'it_executive',
      name: 'IT Executive',
      description: 'IT Executive role with ticket management capabilities',
    },
    {
      key: 'super_admin',
      name: 'Super Admin',
      description: 'Super administrator with full system access',
    },
  ];

  for (const roleData of roles) {
    const existingRole = await roleRepository.findOne({
      where: { key: roleData.key },
    });

    if (!existingRole) {
      const role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`✓ Seeded role: ${roleData.name} (${roleData.key})`);
    } else {
      console.log(`⊘ Role already exists: ${roleData.name} (${roleData.key})`);
    }
  }
}
