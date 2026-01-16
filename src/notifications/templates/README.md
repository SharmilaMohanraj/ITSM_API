# Email Notification Templates

This directory contains JSON template files for email notifications.

## Template Structure

Each template file contains:
- `subject`: Email subject line with variable placeholders
- `text`: Plain text email body with variable placeholders
- `html`: HTML email body with variable placeholders

## Variable Syntax

Templates use `{{variableName}}` syntax for variable replacement.

Example:
```json
{
  "subject": "Ticket {{ticketNumber}} Status Updated",
  "text": "Hello {{userName}}, your ticket {{ticketNumber}}..."
}
```

## Conditional Blocks

Templates support conditional blocks using `{{#if variable}}...{{/if}}` syntax.

Example:
```json
{
  "text": "Hello {{userName}}.{{#if comment}}\n\nComment: {{comment}}{{/if}}"
}
```

The content inside `{{#if variable}}...{{/if}}` will only be rendered if the variable is truthy (not undefined, null, empty string, or false).

## Available Templates

### 1. ticket-status-change.json
**Variables:**
- `userName`: Recipient's name
- `ticketNumber`: Ticket number
- `oldStatus`: Previous status
- `newStatus`: New status

### 2. ticket-resolved.json
**Variables:**
- `userName`: Recipient's name
- `ticketNumber`: Ticket number
- `comment`: Optional resolution comment (conditional)

### 3. ticket-assigned.json
**Variables:**
- `userName`: Recipient's name
- `ticketNumber`: Ticket number
- `ticketTitle`: Ticket title
- `ticketCategory`: Ticket category name
- `ticketPriority`: Ticket priority name

### 4. ticket-created.json
**Variables:**
- `userName`: Recipient's name
- `ticketNumber`: Ticket number
- `ticketTitle`: Ticket title
- `ticketCategory`: Ticket category name
- `ticketPriority`: Ticket priority name
- `ticketStatus`: Ticket status name

### 5. ticket-comment-added.json
**Variables:**
- `userName`: Recipient's name
- `ticketNumber`: Ticket number
- `commentAuthor`: Name of the person who added the comment
- `comment`: Comment content

## Adding New Templates

1. Create a new JSON file in this directory
2. Follow the structure: `subject`, `text`, `html`
3. Use `{{variableName}}` for variables
4. Use `{{#if variable}}...{{/if}}` for conditionals
5. Update `EmailService` to add a method that uses the new template

## Usage Example

```typescript
// In EmailService
const template = this.templateService.render('ticket-status-change', {
  userName: 'John Doe',
  ticketNumber: 'TKT-12345',
  oldStatus: 'Open',
  newStatus: 'In Progress',
});

await this.sendEmail({
  to: 'user@example.com',
  subject: template.subject,
  text: template.text,
  html: template.html,
});
```
