# V ONE CRM / MAHI WHATSAPP PLATFORM - SYSTEM DOCUMENTATION

> **Document Version:** 1.0.0  
> **Target Audience:** System Administrators, Developers, Business Owners, Support Teams  
> **Generated Document File:** `V_ONE_CRM_System_Documentation.docx`

---

## 1. System Overview & Technology Stack

**V ONE CRM** (Mahi WhatsApp Marketing & CRM) is an enterprise multi-tenant platform built for mass WhatsApp broadcast campaigns, automated CRM contact management, 2-way live multi-agent chat, visual drag-and-drop flow building, and Groq AI-powered bot auto-replies.

### Technology Stack
* **Frontend**: React.js (v18), React Router (v6/v7), Custom CSS Design Tokens, React Icons, React Toastify.
* **Backend REST API**: Node.js, Express.js framework, JWT Authentication, Multer file upload handling.
* **Database Engine**: MySQL Relational Database (`whatsapp_crm`) storing users, WABA accounts, templates, campaigns, contacts, drip steps, and activity logs.
* **Core Integrations**:
  1. **Meta WhatsApp Cloud API (v25.0)** & Meta Embedded Signup SDK.
  2. **Groq AI API (Llama-3)** for intelligent AI Agents & chatbot nodes.
  3. **Razorpay Payment Gateway** for prepaid wallet recharges and plan subscriptions.
  4. **Nodemailer SMTP** for system emails and plan expiry alerts.

---

## 2. Admin Flow & Admin Navbar Work Breakdown

The **Admin Flow** provides executive control across all client accounts, Meta WABA accounts, system usage, billing, AI agents, and logs.

### Access & Navigation
* **Admin Login Route:** `/admin/login` (Role required: `admin`)
* **Admin Console Root:** `/admin`

### Admin Navbar Sections & Work Breakdown

#### 📊 1. Overview Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Super Dashboard** | `/admin` | Displays real-time executive KPIs: Total Platform Users, Active WhatsApp Numbers, Messages Sent Today, Total Platform Revenue, Total System Wallet Balance, and Server Status. |
| **Platform Users** | `/admin/users?tab=all` | Full directory of platform client accounts. Filter by role/status, search by email/phone/WABA ID, export system CSV reports, suspend accounts, and send plan expiry alerts. |
| **WA Numbers** | `/admin/numbers?tab=all` | System-wide list of connected WhatsApp phone numbers across all client accounts with phone number IDs, verified display names, quality ratings, and connection status. |

#### 👥 2. User Management Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Users** | `/admin/users?tab=all` | Manage user account records, update user roles, and assign credit modes (Prepaid vs. Postpaid). |
| **User Profiles** | `/admin/users?tab=profiles` | Detailed view of individual user account metrics, connected WABA details, monthly spend, total contacts, and total campaigns. |
| **Roles & Permissions** | `/admin/users?tab=roles` | Delegate administrative permissions (Super Admin, Manager, Agent, Client User). |
| **Suspended Users** | `/admin/users?tab=suspended` | Isolated list of accounts restricted due to policy violation or payment default with quick restore function. |

#### 📘 3. Facebook Integration Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **FB Connections** | `/admin/facebook?tab=connections` | Monitors active Meta Embedded Signup sessions and Facebook user connection tokens. |
| **Page Access Tokens** | `/admin/facebook?tab=tokens` | Manage Facebook Page Access Tokens associated with Meta applications. |
| **Token Expiry Status** | `/admin/facebook?tab=expiry` | Tracks token expiration timelines and sends automated background alerts before tokens expire. |
| **Business Manager** | `/admin/facebook?tab=bm` | Manages Meta Business Manager account bindings and organization verification statuses. |
| **Permissions Review** | `/admin/facebook?tab=permissions` | Audits granted Meta Graph API scope permissions (`whatsapp_business_messaging`, `whatsapp_business_management`). |

#### 💬 4. WhatsApp Cloud API Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **WABA Accounts** | `/admin/whatsapp-api?tab=waba` | Displays all WABA (WhatsApp Business Account) IDs, default phone number IDs, and permanent system user tokens. |
| **Quality Ratings** | `/admin/whatsapp-api?tab=quality` | Monitors Meta phone number quality scores (GREEN/HIGH, YELLOW/MEDIUM, RED/LOW) and messaging volume limit tiers (TIER_250, TIER_1K, TIER_10K, TIER_UNLIMITED). |
| **Webhook Status** | `/admin/whatsapp-api?tab=webhook` | Live monitor for Meta Webhook endpoint (`/api/whatsapp/webhook`), verifying signature headers and inbound message processing. |
| **API Health** | `/admin/whatsapp-api?tab=health` | Executes ping tests against Meta Graph API (v25.0) to measure latency and service availability. |
| **Token Status** | `/admin/whatsapp-api?tab=token` | Validates System User Access Tokens and alerts when token refresh is required. |

#### 📢 5. Campaigns & Broadcast Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Campaigns** | `/admin/messages?tab=all` | Monitors all mass message broadcast campaigns executed by users across the system. |
| **Delivery Reports** | `/admin/messages?tab=reports` | Granular log of message delivery statuses (sent, delivered, read, failed). |
| **Campaign Analytics** | `/admin/messages?tab=analytics` | System-wide broadcast performance charts, response rates, and delivery success metrics. |

#### 📝 6. Templates Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Templates** | `/admin/templates?tab=all` | Central repository of all WhatsApp message templates created across all tenant accounts. |
| **Pending Approval** | `/admin/templates?tab=pending` | Queue of message templates submitted to Meta awaiting review. |
| **Approved** | `/admin/templates?tab=approved` | List of active Meta-approved templates ready for broadcast sending. |
| **Rejected** | `/admin/templates?tab=rejected` | List of templates rejected by Meta with detailed rejection reason codes. |

#### 🔄 7. Flow Builder Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Flows** | `/admin/flows?tab=all` | View and manage visual multi-step interactive chatbot flows created on the platform. |
| **Published Flows** | `/admin/flows?tab=published` | List of active, live interactive flows currently handling incoming customer chats. |
| **Draft Flows** | `/admin/flows?tab=draft` | Work-in-progress flow configurations. |

#### 🤖 8. AI Agents Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Agents** | `/admin/agents` | Configures Groq-powered AI chatbot agents (Customer Support, Sales Bot, Lead Qualifier), system prompts, model parameters, and auto-reply behavior. |

#### 📅 9. Drip Sequences Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Sequences** | `/admin/drip-sequences` | Manages automated multi-step time-delayed drip messaging sequences across tenant accounts. |

#### 💳 10. Platform Billing Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Subscription Plans** | `/admin/pricing?tab=plans` | Create and edit platform subscription tiers (Starter, Pro, Enterprise) with pricing and feature limits. |
| **All Transactions** | `/admin/pricing?tab=transactions` | Complete financial ledger of user wallet top-ups, subscription fees, and balance deductions. |
| **Razorpay Payments** | `/admin/pricing?tab=razorpay` | Integration log for Razorpay payment gateway orders, payments, signatures, and webhooks. |
| **Refunds** | `/admin/pricing?tab=refunds` | Process refund requests and manage wallet balance reversals. |
| **GST Invoices** | `/admin/pricing?tab=gst` | Generate tax-compliant GST invoices for user transactions. |

#### 💰 11. Meta Billing Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Conversation Charges** | `/admin/pricing?tab=conversation` | Tracks direct Meta conversation costs broken down by category (Marketing, Utility, Service, Authentication). |
| **Marketing Charges** | `/admin/pricing?tab=marketing` | Detailed spend analytics for Meta Marketing conversations. |
| **Utility Charges** | `/admin/pricing?tab=utility` | Detailed spend analytics for Meta Utility conversations. |
| **Auth Charges** | `/admin/pricing?tab=auth` | Detailed spend analytics for Meta Authentication OTP conversations. |
| **Meta Invoices** | `/admin/pricing?tab=invoices` | Reconciliation tool matching Meta monthly statements with internal platform message logs. |

#### 📋 12. Contacts & CRM Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Contacts** | `/admin/contacts?tab=all` | Global database view of all contacts stored across user accounts. |
| **Segments & Labels** | `/admin/contacts?tab=labels` | System-wide contact labels, tags, and audience segmentation. |
| **Opt-out List** | `/admin/contacts?tab=optout` | Centralized list of unsubscribed contacts ("STOP" triggers) ensuring Meta compliance. |

#### 📬 13. Notifications Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **System Alerts** | `/admin/notifications-admin?tab=alerts` | High-priority administrative alerts regarding API failures, low balances, or system errors. |
| **Email Notifications** | `/admin/notifications-admin?tab=email` | Logs of transactional email alerts sent via SMTP. |
| **WA Notifications** | `/admin/notifications-admin?tab=whatsapp` | Automated system notification logs sent via WhatsApp. |

#### 📜 14. Activity & Logs Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Login History** | `/admin/logs?tab=login` | Security audit log tracking user & admin login IPs, timestamps, and browser user-agents. |
| **API Logs** | `/admin/logs?tab=api` | Real-time log of REST API calls, endpoints hit, and response status codes. |
| **Error Logs** | `/admin/logs?tab=error` | Exception stack traces and error logs for fast debugging. |
| **Audit Trail** | `/admin/logs?tab=audit` | Historic record of administrative actions, config edits, and balance adjustments. |

#### ⚙️ 15. System Settings Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **General Settings** | `/admin/settings?tab=general` | Configures application name, branding logo, default timezone, default currency, and contact info. |
| **API Configuration** | `/admin/settings?tab=api` | Global key management for Meta Graph API, Groq AI API, and Razorpay Gateway. |
| **SMTP Settings** | `/admin/settings?tab=smtp` | Configures mail server settings (Host, Port, Username, App Password, From Name). |
| **Webhook Settings** | `/admin/settings?tab=webhook` | Configures public Webhook URL and Meta Webhook Verification Token. |
| **Server & Cache** | `/admin/settings?tab=server` | Monitors Node.js process uptime, RAM usage, and provides cache flush controls. |
| **Backup & Restore** | `/admin/settings?tab=backup` | Generates full MySQL database backups and snapshot exports. |
| **Plans Manager** | `/admin/plans` | Manage subscription plan boundaries and feature flags. |

---

## 3. User Flow & User Navbar Work Breakdown

The **User Flow** represents the journey for client account owners and team agents managing WhatsApp marketing campaigns, contact segmentation, live 2-way inbox chat, and bot automation.

### User Lifecycle Steps
1. **Account Registration & Login:** User signs up (`/signup`) or logs in (`/login`).
2. **Meta WhatsApp Business Onboarding:** User links WABA number via Meta Embedded Signup popup (`/onboarding`).
3. **Wallet Recharge:** User recharges credit balance via Razorpay (`/billing`).
4. **Template Submission:** User submits header/body/footer templates to Meta (`/templates`).
5. **Contact Management:** User imports CSV contacts and assigns labels (`/contacts`).
6. **Broadcast Launch:** User triggers mass message campaign (`/broadcast`).
7. **2-Way Live Chat:** Agents respond to incoming customer messages in real-time (`/inbox`).

### User Navbar Sections & Work Breakdown

#### 🏠 1. Dashboard Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Overview** | `/dashboard` | Primary user dashboard displaying live operational statistics: total contacts, messages sent today, unread inbox messages, wallet balance, connected WABA phone number details, and quick launch actions. |
| **Inbox** | `/inbox` | Real-time 2-way WhatsApp Chat Console. Supports viewing active conversations, sending manual text and media replies, selecting canned quick replies, assigning chats to agents, viewing customer profile details, and triggering automated flow bots. Includes unread message badge count. |

#### 👥 2. Contacts Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **All Contacts** | `/contacts` | Contact management portal. Enables manual contact creation, bulk CSV file import (mapping name, phone, custom fields), contact search, editing, and single/bulk deletion. |
| **Labels & Groups** | `/contacts` | Organize contacts using color-coded tags and labels (e.g., VIP, Hot Lead, Customer) for organized audience management. |
| **Segments** | `/contacts` | Filter and group contacts into dynamic segments based on tags and activity for targeted marketing. |

#### 📢 3. Campaigns Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Broadcast** | `/broadcast` | Mass WhatsApp broadcast campaign manager. Select target contact labels, pick approved Meta message template, map dynamic body parameters (e.g. {{1}} = Name), attach media header, schedule launch time, and trigger bulk sending. |
| **Campaign Analytics** | `/broadcast` | Track real-time campaign performance metrics: total sent, delivered percentage, read rate, failed count, and delivery error logs. |
| **Drip Sequences** | `/drip-sequences` | Automate multi-day drip campaign sequences (e.g., Day 0 Welcome Message -> Wait 48 Hours -> Day 2 Follow-Up). |

#### 📝 4. Templates Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **My Templates** | `/templates` | Manage WhatsApp message templates. View template category (Marketing, Utility, Authentication), language, header format, body content, and live approval status from Meta. |
| **Pending / Rejected** | `/templates` | Track templates currently undergoing Meta review or rejected by Meta with feedback. |
| **Approved** | `/templates` | View ready-to-use Meta-approved templates. Includes interactive Modal to create new text, image, document, or video templates with Call-to-Action buttons and submit directly to Meta Graph API. |

#### 🤖 5. Automation Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Flow Builder** | `/flows` | Drag-and-drop interactive chatbot flow builder. Build multi-branch visual bot flows with message nodes, question prompts, conditional logic, external API webhooks, and Groq AI agent nodes. |
| **Quick Replies** | `/quick-replies` | Create and manage shortcut canned responses (`/thanks`, `/pricing`, `/address`) for rapid agent messaging in live inbox. |
| **Auto Reply** | `/flows` | Configure instant keyword-triggered auto-responses for incoming customer messages. |
| **Scheduled Messages** | `/drip-sequences` | View and schedule single or recurring automated messages to specific contacts. |

#### 📈 6. Analytics Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Analytics** | `/analytics` | Visual charts and graphs showing message volume trends (daily/weekly/monthly), sent vs. received rates, and active contact statistics. |
| **Campaign ROI** | `/analytics` | Track campaign conversion performance and customer response rates. |
| **Message Stats** | `/analytics` | Delivery status breakdown (Delivered %, Read %, Failed %) and failure reason distribution. |

#### 💳 7. Billing & Wallet Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Wallet & Balance** | `/billing` | View current prepaid wallet balance, top up funds securely via Razorpay, view estimated remaining message count based on Meta conversation rates. |
| **Meta Billing** | `/billing` | Track conversation charges by Meta category (Marketing, Utility, Service, Authentication). |
| **Payment History** | `/billing` | View and download tax invoices for all wallet top-ups and plan payments. |
| **Subscription Plans** | `/plans` | View, upgrade, or downgrade subscription tiers (Starter, Growth, Pro, Enterprise). |

#### 📞 8. WhatsApp Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Connected Number** | `/settings` | View connected WhatsApp phone number, display name, WABA ID, Phone Number ID, and connection status. |
| **Quality Rating** | `/settings` | Monitor Meta phone number quality score (GREEN, YELLOW, RED) and daily messaging limit tier. |
| **Webhook Status** | `/settings` | Verify live webhook synchronization with Meta Cloud API. |
| **Token Status** | `/settings` | Inspect OAuth access token status and trigger manual token refresh if required. |

#### 📘 9. Facebook Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **FB Connection** | `/settings` | Trigger Meta Embedded Signup popup modal to link Facebook Business Account and WhatsApp Business Account. |
| **Business Manager** | `/settings` | Check Meta Business Manager verification status. |
| **Permissions** | `/settings` | View granted Meta API scope permissions. |
| **Token Status** | `/settings` | Verify Facebook User Token status. |

#### 👨‍💼 10. Team & Agents Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **Team Members** | `/agents` | Invite team members and agents via email to handle customer chat inbox. |
| **Roles** | `/agents` | Assign granular agent roles and inbox permissions. |
| **Performance** | `/agents` | Track agent response speeds, total chats handled, and resolution rates. |

#### ⚙️ 11. Settings Section
| Navbar Item | Route | Functionality & Work Performed |
| :--- | :--- | :--- |
| **General Settings** | `/settings` | Configure business profile name, default country code, timezone, and language preferences. |
| **Security & 2FA** | `/settings` | Manage password updates and account security settings. |
| **Notifications** | `/settings` | Configure email and WhatsApp alert preferences for low wallet balance and system events. |
| **Profile & Branding** | `/settings` | Upload business logo, update WhatsApp Business profile description, address, email, and website link. |

---

## 4. Required API Keys & Environment Variables

Below is the complete reference table of all environment variables, database keys, secrets, and API credentials required across **Server (`server/.env`)** and **Client (`client/.env`)**:

| Variable Name | Scope | Description & Purpose | Example / Setting |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | Server | Hostname for MySQL database connection | `localhost` |
| `DB_PORT` | Server | Port number for MySQL database server | `3307` / `3306` |
| `DB_NAME` | Server | Database schema name | `whatsapp_crm` |
| `DB_USER` | Server | MySQL database user | `root` |
| `DB_PASS` | Server | MySQL database password | `[empty or password]` |
| `JWT_SECRET` | Server | Secret key used for signing & verifying user JWT tokens | `whatsapp_crm_jwt_secret_2026_k8x9m2` |
| `WHATSAPP_APP_ID` | Server/Client | Meta App ID from Meta Developer Portal | `1590795935988169` |
| `WHATSAPP_APP_SECRET` | Server | Meta App Secret for secure Graph API OAuth calls | `f94e6ead41fa1227163240e0f3825ad5` |
| `WHATSAPP_SYSTEM_USER_TOKEN` | Server | Meta Permanent System User Access Token | `EAAWm0gqsuckBS...` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Server | Secret token for verifying Meta Webhook handshake | `mahi_crm_webhook_token_2026` |
| `WHATSAPP_CONFIG_ID` | Server | Configuration ID for Meta Embedded Signup popup | `1569573811314694` |
| `WHATSAPP_GRAPH_API_VERSION` | Server | Target Meta Graph API version | `v25.0` |
| `WHATSAPP_REDIRECT_URI` | Server | OAuth callback URL for Facebook login | `http://localhost:3000/onboarding/callback` |
| `WHATSAPP_PHONE_NUMBER_ID` | Server | Default system phone number ID | `1269197539606780` |
| `WHATSAPP_WABA_ID` | Server | Default WhatsApp Business Account ID | `1014658487838546` |
| `RAZORPAY_KEY_ID` | Server | Razorpay Key ID for payments and checkout modal | `rzp_live_T0hHQkCXWwsjRp` |
| `RAZORPAY_KEY_SECRET` | Server | Razorpay Key Secret for verifying order signatures | `nROqQ4okM5617sQ4RrwnKp8v` |
| `SMTP_HOST` | Server | Mail server hostname for transactional email alerts | `smtp.gmail.com` |
| `SMTP_PORT` | Server | SMTP server port | `587` |
| `SMTP_USERNAME` | Server | Email address used for SMTP authentication | `kornepatimahankali35@gmail.com` |
| `SMTP_APP_PASSWORD` | Server | App password for Gmail SMTP authentication | `kttq onun yugn hwlt` |
| `SMTP_FROM_NAME` | Server | Sender display name for emails | `V ONE DIGITALS` |
| `GROQ_API_KEY` | Server | API key for Groq AI (Llama-3 model for AI Agent bots) | `gsk_ogfbDXmsbmVKX6Uo3L...` |
| `PORT` | Server | Backend REST API server port | `5000` / `8000` |
| `NODE_ENV` | Server | Node environment execution mode | `development` / `production` |
| `REACT_APP_WHATSAPP_APP_ID` | Client | Meta App ID exposed to React frontend for SDK | `4257112177765455` |
| `REACT_APP_API_URL` | Client | Base REST API URL for frontend HTTP requests | `http://localhost:8000/api` |
