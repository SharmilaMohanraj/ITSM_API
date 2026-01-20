import { DataSource } from 'typeorm';
import { TicketCategory } from '../../entities/ticket-category.entity';
import { TicketPriority } from '../../entities/ticket-priority.entity';
import { TicketStatus } from '../../entities/ticket-status.entity';
import { NotificationRule, TicketEvent } from '../../entities/notification-rule.entity';
import { RecipientType } from '../../entities/notification-rule.entity';

interface CategorySeedData {
  name: string;
  description: string;
  code: string;
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

interface NotificationRuleSeedData {
  event: TicketEvent;
  recipientType: RecipientType[];
}

const TICKET_CATEGORIES: CategorySeedData[] = [
  {
    name: 'Hardware',
    description: 'Laptop, monitor, keyboard issues with typical resolution times',
    code: 'HW',
  },
  {
    name: 'Software',
    description: 'Application crashes, installations, licensing',
    code: 'SW',
  },
  {
    name: 'Network',
    description: 'VPN, WiFi, connectivity problems',
    code: 'NW',
  },
  {
    name: 'Access and Permissions',
    description: 'Password resets, account access',
    code: 'AP',
  },
  {
    name: 'Infrastructure',
    description: 'Servers, databases, cloud issues',
    code: 'IS',
  },
  { 
    name: 'Security',
    description: 'Malware, breaches, phishing',
    code: 'ST',
  },
  {
    name: 'Request',
    description: 'New equipment, software purchases, service requests',
    code: 'SR',
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

const NOTIFICATION_RULES: NotificationRuleSeedData[] = [
  {
    event: TicketEvent.CREATE,
    recipientType: [RecipientType.CREATED_BY, RecipientType.CATEGORY_IT_MANAGERS],
  },
  {
    event: TicketEvent.STATUS_CHANGE,
    recipientType: [RecipientType.CREATED_BY, RecipientType.ASSIGNED_TO],
  },
  {
    event: TicketEvent.ASSIGN,
    recipientType: [RecipientType.CREATED_BY, RecipientType.ASSIGNED_TO],
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

export async function seedNotificationRules(
  dataSource: DataSource,
): Promise<void> {
  const notificationRuleRepository = dataSource.getRepository(NotificationRule);
  for (const notificationRuleData of NOTIFICATION_RULES) {
    const existingNotificationRule = await notificationRuleRepository.findOne({
      where: { event: notificationRuleData.event },
    });
    if (!existingNotificationRule) {
      const notificationRule = notificationRuleRepository.create(notificationRuleData);
      await notificationRuleRepository.save(notificationRule);
      console.log(`✓ Seeded notification rule: ${notificationRuleData.event}`);
    } else {
      console.log(`⊘ Notification rule already exists: ${notificationRuleData.event}`);
    }
  }
}

export async function seedTicketLookups(
  dataSource: DataSource,
): Promise<void> {
  await seedTicketCategories(dataSource);
  await seedTicketPriorities(dataSource);
  await seedTicketStatuses(dataSource);
  await seedNotificationRules(dataSource);
}
