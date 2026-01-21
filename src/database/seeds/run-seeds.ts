import { DataSource } from 'typeorm';
import { seedRoles } from './roles.seed';
import { seedSuperAdmins } from './super-admin.seed';
import { seedTicketLookups } from './ticket-lookup.seed';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { Ticket } from '../../entities/ticket.entity';
import { Team } from '../../entities/team.entity';
import { Comment } from '../../entities/comment.entity';
import { Attachment } from '../../entities/attachment.entity';
import { TicketHistory } from '../../entities/ticket-history.entity';
import { TicketCategory } from '../../entities/ticket-category.entity';
import { TicketStatus } from '../../entities/ticket-status.entity';
import { TicketPriority } from '../../entities/ticket-priority.entity';
import { Notification } from '../../entities/notification.entity';
import { UserCategory } from '../../entities/user-category.entity';
import { NotificationRule } from '../../entities/notification-rule.entity';
import { Organization } from '../../entities/organization.entity';
import { Department } from '../../entities/department.entity';

async function runSeeds() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'itsm_db',
    entities: [
      User,
      Role,
      Ticket,
      Team,
      Comment,
      Attachment,
      TicketHistory,
      TicketCategory,
      TicketStatus,
      TicketPriority,
      Notification,
      UserCategory,
      NotificationRule,
      Organization,
      Department,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    // Seed roles first
    console.log('\n=== Seeding Roles ===');
    await seedRoles(dataSource);

    // Seed super admins
    console.log('\n=== Seeding Super Admins ===');
    await seedSuperAdmins(dataSource);

    // Seed ticket lookups (categories, priorities, statuses)
    console.log('\n=== Seeding Ticket Lookups ===');
    await seedTicketLookups(dataSource);

    console.log('\n✓ All seeds completed successfully');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error running seeds:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeeds();
