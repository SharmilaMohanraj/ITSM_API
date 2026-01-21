import { DataSource } from 'typeorm';
import { TicketCategory } from '../../entities/ticket-category.entity';
import { TicketPriority } from '../../entities/ticket-priority.entity';
import { TicketStatus } from '../../entities/ticket-status.entity';
import { NotificationRule, TicketEvent } from '../../entities/notification-rule.entity';
import { RecipientType } from '../../entities/notification-rule.entity';
import { Organization } from '../../entities/organization.entity';
import { Department } from '../../entities/department.entity';

interface OrganizationSeedData {
  name: string;
  description: string;
}

interface DepartmentSeedData {
  name: string;
  description: string;
}
interface CategorySeedData {
  name: string;
  description: string;
  code: string;
  departmentName: string;
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

const ORGANIZATION_SEED = {
  name: 'Generic Organization',
  description: 'Default organization for ticketing system',
};

const DEPARTMENT_SEEDS = [
  { name: 'IT', description: 'IT Support Department' },
  { name: 'HR', description: 'Human Resources' },
  { name: 'Finance', description: 'Finance & Accounts' },
  { name: 'Admin', description: 'Administration' },
];

const TICKET_CATEGORIES: CategorySeedData[] = [
  {
    name: 'Hardware',
    description: 'Laptop, monitor, keyboard issues with typical resolution times',
    code: 'HW',
    departmentName: 'IT',
  },
  {
    name: 'Software',
    description: 'Application crashes, installations, licensing',
    code: 'SW',
    departmentName: 'IT',
  },
  {
    name: 'Network',
    description: 'VPN, WiFi, connectivity problems',
    code: 'NW',
    departmentName: 'IT',
  },
  {
    name: 'Access and Permissions',
    description: 'Password resets, account access',
    code: 'AP',
    departmentName: 'IT',
  },
  {
    name: 'Infrastructure',
    description: 'Servers, databases, cloud issues',
    code: 'IS',
    departmentName: 'IT',
  },
  { 
    name: 'Security',
    description: 'Malware, breaches, phishing',
    code: 'ST',
    departmentName: 'IT',
  },
  {
    name: 'Request',
    description: 'New equipment, software purchases, service requests',
    code: 'SR',
    departmentName: 'IT',
  },
  {
    name: 'Leave & Attendance',
    code: 'LA',
    description: 'Leave balance, attendance, WFH, overtime issues',
    departmentName: 'HR',
  },
  {
    name: 'Employee Details',
    code: 'ED',
    description: 'Employee personal and contact information updates',
    departmentName: 'HR',
  },
  {
    name: 'Payroll & Salary',
    code: 'PS',
    description: 'Salary, payslip, tax, deductions, Form-16',
    departmentName: 'HR',
  },
  {
    name: 'Benefits & Policies',
    code: 'BP',
    description: 'Insurance, reimbursements, company policies',
    departmentName: 'HR',
  },
  {
    name: 'Employee Documents',
    code: 'DO',
    description: 'Offer letter, experience letter, verification, NOC',
    departmentName: 'HR',
  },
  {
    name: 'Office Access',
    code: 'OA',
    description: 'Access card, biometric, parking, visitor management',
    departmentName: 'Admin',
  },
  {
    name: 'Seating & Workspace',
    code: 'SWC',
    description: 'Desk, chair, seating changes, workspace setup',
    departmentName: 'Admin',
  },
  {
    name: 'Office Supplies',
    code: 'OS',
    description: 'Stationery, printer supplies, pantry items',
    departmentName: 'Admin',
  },
  {
    name: 'Facility Issues',
    code: 'FI',
    description: 'AC, power, water, lighting, housekeeping',
    departmentName: 'Admin',
  },
  {
    name: 'Transportation',
    code: 'TR',
    description: 'Office cab, travel booking, pickup/drop issues',
    departmentName: 'Admin',
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
    recipientType: [RecipientType.CREATED_BY, RecipientType.ASSIGNED_TO],
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

async function seedTicketCategories(
  dataSource: DataSource,
  departmentMap: Map<string, Department>,
): Promise<void> {
  const categoryRepo = dataSource.getRepository(TicketCategory);

  for (const categoryData of TICKET_CATEGORIES) {
    const department = departmentMap.get(categoryData.departmentName);
    if (!department) {
      console.warn(`⚠ Department not found for category: ${categoryData.name}`);
      continue;
    }

    const existingCategory = await categoryRepo.findOne({
      where: { code: categoryData.code },
    });

    if (!existingCategory) {
      const category = categoryRepo.create({
        name: categoryData.name,
        description: categoryData.description,
        code: categoryData.code,
        departmentId: department.id,
      });

      await categoryRepo.save(category);
      console.log(`✔ Category created: ${category.name}`);
    } else {
      console.log(`⊘ Category already exists: ${categoryData.name}`);
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

async function seedOrganization(dataSource: DataSource): Promise<Organization> {
  const orgRepo = dataSource.getRepository(Organization);

  let organization = await orgRepo.findOne({
    where: { name: ORGANIZATION_SEED.name },
  });

  if (!organization) {
    organization = orgRepo.create(ORGANIZATION_SEED);
    organization = await orgRepo.save(organization);
    console.log(`✔ Organization created: ${organization.name}`);
  } else {
    console.log(`⊘ Organization already exists: ${organization.name}`);
  }

  return organization;
}

async function seedDepartments(
  dataSource: DataSource,
  organization: Organization,
): Promise<Map<string, Department>> {
  const deptRepo = dataSource.getRepository(Department);
  const departmentMap = new Map<string, Department>();

  for (const deptData of DEPARTMENT_SEEDS) {
    let department = await deptRepo.findOne({
      where: {
        name: deptData.name,
        organizationId: organization.id,
      },
    });

    if (!department) {
      department = deptRepo.create({
        ...deptData,
        organizationId: organization.id,
      });
      department = await deptRepo.save(department);
      console.log(`✔ Department created: ${department.name}`);
    } else {
      console.log(`⊘ Department already exists: ${department.name}`);
    }

    departmentMap.set(deptData.name, department);
  }

  return departmentMap;
}


export async function seedTicketLookups(
  dataSource: DataSource,
): Promise<void> {
  const organization = await seedOrganization(dataSource);
  const departmentMap = await seedDepartments(dataSource, organization);
  await seedTicketCategories(dataSource, departmentMap);
  await seedTicketPriorities(dataSource);
  await seedTicketStatuses(dataSource);
  await seedNotificationRules(dataSource);
}
