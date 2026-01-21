# ITSM_API

ITSM (IT Service Management) API built with NestJS, PostgreSQL, and JWT authentication.

A comprehensive ITSM (IT Service Management) application built with NestJS, PostgreSQL, and JWT authentication.

## Features

- ✅ PostgreSQL database integration with TypeORM
- ✅ JWT-based authentication
- ✅ Role-based access control (Employee/IT Manager)
- ✅ Ticket management system with CRUD operations
- ✅ Ticket categories, priorities, and statuses
- ✅ User management

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

```bash
npm install
```

## Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE itsm_db;
```

2. Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=itsm_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Environment
NODE_ENV=development
```

## Running the app

```bash
# development
npm run start:dev

# production mode
npm run start:prod
```

The application runs on `http://localhost:3000` by default.

## API Endpoints

### Authentication

- `POST /auth/login` - Login and get JWT token
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Users

- `POST /users/register` - Register a new user (public)
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee" // or "it_manager"
  }
  ```

- `POST /users` - Create user (IT Manager only)
- `GET /users` - Get all users (IT Manager only)
- `GET /users/:id` - Get user by ID (IT Manager only)

### Tickets

- `POST /tickets` - Create a new ticket (Authenticated)
  ```json
  {
    "title": "Laptop not working",
    "description": "My laptop won't turn on",
    "category": "Hardware",
    "priority": "High",
    "assignedToId": "optional-user-uuid"
  }
  ```

- `GET /tickets` - Get all tickets
  - Employees: Only see tickets assigned to them
  - IT Managers: See all tickets

- `GET /tickets/:id` - Get ticket by ID
- `PATCH /tickets/:id` - Update ticket (Authenticated)
- `DELETE /tickets/:id` - Delete ticket (IT Manager only)

## Ticket Categories

1. Hardware - Laptop, monitor, keyboard issues
2. Software - Application crashes, installations, licensing
3. Network - VPN, WiFi, connectivity problems
4. Access and Permissions - Password resets, account access
5. Infrastructure - Servers, databases, cloud issues
6. Security - Malware, breaches, phishing
7. Request - New equipment, software purchases, service requests

## Ticket Priorities

- **Critical** - 30min response, 4hr resolution (System outages, security breaches)
- **High** - 2hr response, 24hr resolution (Cannot work, urgent needs)
- **Medium** - 4hr response, 48hr resolution (Degraded performance)
- **Low** - 8hr response, 5 day resolution (Nice-to-have features)

## Ticket Statuses

New, Assigned, In Progress, Waiting, On Hold, Resolved, Closed, Cancelled, Escalated

## User Roles

- **employee** - Can create tickets and view assigned tickets
- **manager** - Full access to all tickets and user management
- **it_executive** - Full access to all tickets and user management

## Authentication

All endpoints except `/auth/login` and `/users/register` require authentication.

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Test

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

