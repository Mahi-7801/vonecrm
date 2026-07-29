# V ONE DIGITALS CRM - Laravel Backend

Production-grade WhatsApp Business CRM Backend built with Laravel 11.

## Requirements

- PHP 8.2+
- MySQL 8.0
- Composer
- Node.js (for frontend)

## Setup Instructions

### 1. Install Dependencies

```bash
cd server-php
composer install
```

### 2. Configure Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your database credentials and API keys.

### 3. Create Database

```sql
CREATE DATABASE whatsapp_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migrations

```bash
php artisan migrate
```

### 5. Seed Database

```bash
php artisan db:seed
```

This creates:
- Admin user: `admin` / `admin123`
- 3 subscription plans (Basic, Professional, Enterprise)
- 5 prebuilt AI agents

### 6. Start Development Server

```bash
php artisan serve --port=8000
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login (returns JWT) |
| POST | /api/auth/admin-login | Admin login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/change-password | Change password |

### Contacts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create contact |
| PUT | /api/contacts/{id} | Update contact |
| DELETE | /api/contacts/{id} | Delete contact |
| POST | /api/contacts/import | Import CSV |
| GET | /api/contacts/labels | List labels |
| POST | /api/contacts/labels | Create label |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/messages | Inbox (conversations) |
| GET | /api/messages/{contactId} | Message thread |
| POST | /api/messages/send | Send message |
| POST | /api/messages/upload-media | Upload media |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | List templates |
| POST | /api/templates | Create + submit to Meta |
| PUT | /api/templates/{id} | Update template |
| DELETE | /api/templates/{id} | Soft delete |
| POST | /api/templates/{id}/submit | Submit to Meta |
| POST | /api/templates/sync | Sync from Meta |

### Flows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/flows | List flows |
| POST | /api/flows | Create flow |
| PUT | /api/flows/{id} | Update flow |
| DELETE | /api/flows/{id} | Delete flow |
| POST | /api/flows/{id}/test | Test flow |
| POST | /api/flows/{id}/conversation | Start conversation |

### WhatsApp
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/whatsapp/webhook | Webhook verification |
| POST | /api/whatsapp/webhook | Webhook receiver |
| POST | /api/whatsapp/connect | Embedded Signup |
| POST | /api/whatsapp/auto-connect | Auto-connect |
| GET | /api/whatsapp/numbers | List numbers |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/billing/usage | Usage breakdown |
| GET | /api/billing/payments | Payment history |
| POST | /api/billing/create-order | Create Razorpay order |
| POST | /api/billing/verify-payment | Verify payment |

### Broadcast
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/broadcast/send | Send broadcast |
| GET | /api/broadcast/history | Broadcast history |
| POST | /api/broadcast/schedule | Schedule broadcast |

### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/plans | List active plans |
| POST | /api/plans/{id}/create-order | Create order |
| POST | /api/plans/verify-payment | Verify + activate |
| GET | /api/plans/my-subscription | Current subscription |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Platform KPIs |
| GET | /api/admin/users | All users |
| PUT | /api/admin/users/{id} | Update user |
| POST | /api/admin/publish | Publish items |
| POST | /api/admin/templates/{id}/approve-meta | Approve template |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Client dashboard |
| GET | /api/ai-agents | List AI agents |
| GET | /api/agents | List human agents |
| GET | /api/canned-responses | Quick replies |
| GET | /api/drip-sequences | Drip sequences |
| GET | /api/notifications | Notifications |
| GET | /api/integrations | Integrations |

## Database Tables (23)

1. users
2. whatsapp_numbers
3. contacts
4. messages
5. templates
6. flows
7. flow_runs
8. flow_conversations
9. flow_messages
10. plans
11. subscriptions
12. payments
13. pricing_config
14. usage_log
15. notifications
16. canned_responses
17. campaigns
18. ai_agents
19. drip_sequences
20. agents
21. chat_assignments
22. scheduled_broadcasts
23. integrations
24. contact_labels

## Features

- JWT Authentication with role-based access
- Multi-tenant architecture
- WhatsApp Business API integration
- Meta template auto-submission
- Webhook handling with signature verification
- Flow builder with AI responses
- Razorpay payment integration
- Bulk broadcast with scheduling
- Groq AI auto-replies
- Telegram bot integration
- Email notifications (PHPMailer)
- Admin dashboard with KPIs
- Wallet/balance system (prepaid/postpaid)
- Usage tracking and billing

## Default Credentials

- **Admin**: admin / admin123

## Tech Stack

- Laravel 11
- PHP 8.2+
- MySQL 8.0
- Firebase JWT
- Razorpay SDK
- PHPMailer
- Groq AI API
