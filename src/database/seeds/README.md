# Database Seeds

This directory contains database seeding scripts for initializing the application with required data.

## Running Seeds

To run all seeds:

```bash
npm run seed:roles
```

Or directly with ts-node:

```bash
ts-node -r tsconfig-paths/register src/database/seeds/run-seeds.ts
```

## Seed Scripts

### 1. Roles Seed (`roles.seed.ts`)
Seeds the following roles:
- **employee**: Regular employee role
- **manager**: IT Manager role with ticket management capabilities
- **it_executive**: IT Executive role with ticket management capabilities
- **super_admin**: Super administrator with full system access

### 2. Super Admin Seed (`super-admin.seed.ts`)
Creates initial super admin user:
- **Email**: superadmin@itsm.com
- **Password**: SuperAdmin@123
- **Full Name**: Super Administrator

**Note**: You can modify the `SUPER_ADMINS` array in `super-admin.seed.ts` to add more super admin users.

### 3. Ticket Lookup Seed (`ticket-lookup.seed.ts`)
Seeds ticket-related lookup data:

**Ticket Categories** (7 categories):
- Hardware - Laptop, monitor, keyboard issues
- Software - Application crashes, installations, licensing
- Network - VPN, WiFi, connectivity problems
- Access and Permissions - Password resets, account access
- Infrastructure - Servers, databases, cloud issues
- Security - Malware, breaches, phishing
- Request - New equipment, software purchases, service requests

**Ticket Priorities** (4 levels):
- Critical (30min response, 4hr resolution) - System outages, security breaches
- High (2hr response, 24hr resolution) - Cannot work, urgent needs
- Medium (4hr response, 48hr resolution) - Degraded performance
- Low (8hr response, 5 day resolution) - Nice-to-have features

**Ticket Statuses** (9 statuses):
- New, Assigned, In Progress, Waiting, On Hold, Resolved, Closed, Cancelled, Escalated

## Environment Variables

The seed scripts use the following environment variables (with defaults):
- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 5432)
- `DB_USERNAME` (default: postgres)
- `DB_PASSWORD` (default: postgres)
- `DB_NAME` (default: itsm_db)

Make sure your `.env` file is configured before running seeds.

## Execution Order

1. Roles are seeded first (required for super admin creation)
2. Super admins are seeded second
3. Ticket lookups (categories, priorities, statuses) are seeded third