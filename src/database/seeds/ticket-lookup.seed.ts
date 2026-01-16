import { DataSource } from 'typeorm';
import { TicketCategory } from '../../entities/ticket-category.entity';
import { TicketPriority } from '../../entities/ticket-priority.entity';
import { TicketStatus } from '../../entities/ticket-status.entity';

interface CategorySeedData {
  name: string;
  description: string;
}

interface PrioritySeedData {
  name: string;
  description: string;
  order: number;
}

interface StatusSeedData {
  name: string;
  description: string;
}

const TICKET_CATEGORIES: CategorySeedData[] = [
  {
    name: 'Hardware',
    description: 'Laptop, monitor, keyboard issues with typical resolution times',
  },
  {
    name: 'Software',
    description: 'Application crashes, installations, licensing',
  },
  {
    name: 'Network',
    description: 'VPN, WiFi, connectivity problems',
  },
  {
    name: 'Access and Permissions',
    description: 'Password resets, account access',
  },
  {
    name: 'Infrastructure',
    description: 'Servers, databases, cloud issues',
  },
  {
    name: 'Security',
    description: 'Malware, breaches, phishing',
  },
  {
    name: 'Request',
    description: 'New equipment, software purchases, service requests',
  },
];

const TICKET_PRIORITIES: PrioritySeedData[] = [
  {
    name: 'Critical',
    description: '30min response, 4hr resolution - System outages, security breaches',
    order: 1,
  },
  {
    name: 'High',
    description: '2hr response, 24hr resolution - Cannot work, urgent needs',
    order: 2,
  },
  {
    name: 'Medium',
    description: '4hr response, 48hr resolution - Degraded performance',
    order: 3,
  },
  {
    name: 'Low',
    description: '8hr response, 5 day resolution - Nice-to-have features',
    order: 4,
  },
];

const TICKET_STATUSES: StatusSeedData[] = [
  {
    name: 'New',
    description: 'Newly created ticket awaiting assignment',
  },
  {
    name: 'Assigned',
    description: 'Ticket has been assigned to an agent',
  },
  {
    name: 'In Progress',
    description: 'Ticket is currently being worked on',
  },
  {
    name: 'Waiting',
    description: 'Ticket is waiting for user response or external action',
  },
  {
    name: 'On Hold',
    description: 'Ticket is temporarily on hold',
  },
  {
    name: 'Resolved',
    description: 'Ticket has been resolved and is awaiting confirmation',
  },
  {
    name: 'Closed',
    description: 'Ticket has been closed',
  },
  {
    name: 'Cancelled',
    description: 'Ticket has been cancelled',
  },
  {
    name: 'Escalated',
    description: 'Ticket has been escalated to higher priority or management',
  },
];

export async function seedTicketCategories(
  dataSource: DataSource,
): Promise<void> {
  const categoryRepository = dataSource.getRepository(TicketCategory);

  for (const categoryData of TICKET_CATEGORIES) {
    const existingCategory = await categoryRepository.findOne({
      where: { name: categoryData.name },
    });

    if (!existingCategory) {
      const category = categoryRepository.create(categoryData);
      await categoryRepository.save(category);
      console.log(`✓ Seeded ticket category: ${categoryData.name}`);
    } else {
      console.log(
        `⊘ Ticket category already exists: ${categoryData.name}`,
      );
    }
  }
}

export async function seedTicketPriorities(
  dataSource: DataSource,
): Promise<void> {
  const priorityRepository = dataSource.getRepository(TicketPriority);

  for (const priorityData of TICKET_PRIORITIES) {
    const existingPriority = await priorityRepository.findOne({
      where: { name: priorityData.name },
    });

    if (!existingPriority) {
      const priority = priorityRepository.create(priorityData);
      await priorityRepository.save(priority);
      console.log(`✓ Seeded ticket priority: ${priorityData.name}`);
    } else {
      console.log(`⊘ Ticket priority already exists: ${priorityData.name}`);
    }
  }
}

export async function seedTicketStatuses(
  dataSource: DataSource,
): Promise<void> {
  const statusRepository = dataSource.getRepository(TicketStatus);

  for (const statusData of TICKET_STATUSES) {
    const existingStatus = await statusRepository.findOne({
      where: { name: statusData.name },
    });

    if (!existingStatus) {
      const status = statusRepository.create(statusData);
      await statusRepository.save(status);
      console.log(`✓ Seeded ticket status: ${statusData.name}`);
    } else {
      console.log(`⊘ Ticket status already exists: ${statusData.name}`);
    }
  }
}

export async function seedTicketLookups(
  dataSource: DataSource,
): Promise<void> {
  await seedTicketCategories(dataSource);
  await seedTicketPriorities(dataSource);
  await seedTicketStatuses(dataSource);
}
