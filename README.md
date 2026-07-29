# V ONE CRM — Enterprise WhatsApp Business Platform & CRM

[![PHP Framework](https://img.shields.io/badge/Laravel-11.55-red.svg)](https://laravel.com)
[![Frontend](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org)
[![Meta Graph API](https://img.shields.io/badge/Meta_Graph_API-v25.0-0080FF.svg)](https://developers.facebook.com)
[![License](https://img.shields.io/badge/License-Proprietary-green.svg)]()

V ONE CRM is a complete, 100% production-ready WhatsApp Business Management & CRM Platform featuring bulk WhatsApp campaign dispatching, live 2-way inbox, Groq AI (`Llama-3`) auto-reply bots, interactive flow builders, drip sequences, contact segmentation, Razorpay billing, and administrative governance.

---

## 🚀 Key Features & Architectural Highlights

- **⚡ Async Bulk Campaign Engine**: Instant HTTP 202 response with background job processing (`SendBroadcastJob`) and live React progress bar status polling (`/api/broadcast/job/{id}`), preventing HTTP 504 Gateway Timeouts.
- **🎯 Dynamic Variable Substitution**: Maps template variables `{{1}}`, `{{2}}`, `{{3}}` dynamically from UI payloads or custom contact attributes (eliminating hardcoded parameter bugs).
- **💰 Prepaid Wallet & Cost Reservation**: Pre-calculates total campaign cost (`contact_count * rate`) and pre-deducts balance upfront before initiating sends, preventing negative wallet balance vulnerabilities.
- **🔄 Unified Status ENUM Standardization**: Unified `'pending'`, `'processing'`, `'completed'`, `'sent'`, `'failed'`, `'cancelled'`, and `'scheduled'` status across MySQL database schema, PHP API, and React UI.
- **⚡ Chunked SQL Batch Inserts**: Message log records are inserted in batches of 100 (`DB::table('messages')->insert($chunk)`), eliminating MySQL connection pool exhaustion.
- **🤖 Groq AI Bot Integration**: Llama-3 model integration with customizable system prompts and agent roles.
- **💳 Razorpay Payment Checkout**: Online subscription upgrades and wallet top-ups with signature verification (`verify-payment`) and subscription paywall protection.
- **🛡️ Admin Governance**: Global user management, balance adjustments, category rate configurations (`marketing`, `utility`, `authentication`), and platform statistics.

---

## 🗄️ Database Schema & Setup

The complete database schema is included in this repository:
- **Primary Schema**: [`vonecrm-database.sql`](./vonecrm-database.sql)
- **Full Database Dump**: [`full_database_schema.sql`](./full_database_schema.sql)

### MySQL Setup Instructions:
1. Create a MySQL database (e.g. `whatsapp_crm`).
2. Import the schema file into your MySQL database:
   ```bash
   mysql -u root -p whatsapp_crm < vonecrm-database.sql
   ```
3. Database port configuration is supported (e.g. Port `3307` or `3306`).

---

## 🛠️ Installation & Setup

### 1. PHP Laravel Backend (`server-php`)
```bash
cd server-php
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
```

Configure your `.env` settings:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=whatsapp_crm
DB_USERNAME=root
DB_PASSWORD=
```

Start the PHP Laravel API server:
```bash
php artisan serve --port=8000
```

### 2. React Frontend (`client`)
```bash
cd client
npm install
npm start
```

Build for Production:
```bash
cd client
npm run build
```

---

## 📅 Scheduled Tasks & Cron Jobs

To run scheduled WhatsApp broadcasts and drip sequences automatically, add the following cron command:
```bash
* * * * * cd /path-to-project/server-php && php artisan schedule:run >> /dev/null 2>&1
```

Or trigger manually via Artisan:
```bash
php artisan app:process-scheduled-broadcasts
```

---

## 📜 Documentation

- [Project Overview & Setup Guide](./PROJECT_DOCUMENTATION.md)
- [WhatsApp Integration Guide](./WHATSAPP_INTEGRATION_COMPLETE.md)
- [Developer Task Tickets & Audit Report](./TEAM_DEVELOPER_TASK_SOLUTIONS.md)

---

Developed for **V ONE DIGITALS**.
