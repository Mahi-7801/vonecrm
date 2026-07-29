SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','client') NOT NULL DEFAULT 'client',
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `credit_mode` enum('prepaid','postpaid') NOT NULL DEFAULT 'postpaid',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for users
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `balance`, `credit_mode`, `created_at`, `updated_at`) VALUES (1, 'admin', '$2y$12$fG1.vE5OcuOdJ2/mqNQ7ZO6WPJRYaBl1Nb1lxiYIAySLSnP7zwweO', 'admin', 0.00, 'postpaid', '2026-07-26 07:09:31', '2026-07-26 07:56:40');
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `balance`, `credit_mode`, `created_at`, `updated_at`) VALUES (2, 'pmahi7801@gmail.com', '$2y$12$vK8Va3lBVHPa8Vyf/3EKsOzvNw7PBFJLRlfRZUW5MWBa9R164izwe', 'client', 0.00, 'postpaid', '2026-07-26 07:26:40', '2026-07-26 07:26:40');

DROP TABLE IF EXISTS `whatsapp_numbers`;
CREATE TABLE `whatsapp_numbers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `phone_number_id` varchar(255) NOT NULL,
  `waba_id` varchar(255) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('pending','verified','suspended') NOT NULL DEFAULT 'pending',
  `access_token` text DEFAULT NULL,
  `display_phone_number` varchar(255) DEFAULT NULL,
  `verified_name` varchar(255) DEFAULT NULL,
  `added_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_numbers_owner_id_foreign` (`owner_id`),
  CONSTRAINT `whatsapp_numbers_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `tags` longtext  DEFAULT NULL,
  `custom_fields` longtext  DEFAULT NULL,
  `label` enum('new','pending','resolved','archived') DEFAULT NULL,
  `label_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contacts_owner_id_foreign` (`owner_id`),
  CONSTRAINT `contacts_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `templates`;
CREATE TABLE `templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` enum('marketing','utility','authentication') NOT NULL,
  `language` varchar(255) NOT NULL DEFAULT 'en_US',
  `header` text DEFAULT NULL,
  `body` text NOT NULL,
  `footer` text DEFAULT NULL,
  `buttons` longtext  DEFAULT NULL,
  `status` enum('pending','approved','rejected','active') NOT NULL DEFAULT 'pending',
  `meta_template_id` varchar(255) DEFAULT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `templates_owner_id_foreign` (`owner_id`),
  CONSTRAINT `templates_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `direction` enum('inbound','outbound') NOT NULL,
  `body` text DEFAULT NULL,
  `template_id` bigint(20) unsigned DEFAULT NULL,
  `wa_message_id` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `message_type` varchar(255) NOT NULL DEFAULT 'text',
  `media_url` varchar(255) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_owner_id_foreign` (`owner_id`),
  KEY `messages_contact_id_foreign` (`contact_id`),
  KEY `messages_template_id_foreign` (`template_id`),
  CONSTRAINT `messages_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `flows`;
CREATE TABLE `flows` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `flow_json` longtext  DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 0,
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `trigger_keyword` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flows_owner_id_foreign` (`owner_id`),
  CONSTRAINT `flows_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for flows
INSERT INTO `flows` (`id`, `owner_id`, `name`, `flow_json`, `active`, `is_published`, `trigger_keyword`, `created_at`, `updated_at`) VALUES (1, 1, 'Welcome Flow', '{\"nodes\":[{\"id\":\"start\",\"type\":\"start\",\"x\":400,\"y\":50,\"data\":{\"message\":\"Welcome!\"}},{\"id\":\"greet\",\"type\":\"message\",\"x\":400,\"y\":150,\"data\":{\"message\":\"Hello! Welcome to our platform.\\n\\nHow can we help you today?\",\"buttons\":[]}},{\"id\":\"services\",\"type\":\"list_message\",\"x\":400,\"y\":280,\"data\":{\"message\":\"Select a service to learn more:\",\"button_text\":\"View Services\",\"sections\":[{\"title\":\"Our Services\",\"rows\":[{\"id\":\"fullstack\",\"title\":\"Full Stack Development\",\"description\":\"React, Node.js, MERN\"},{\"id\":\"wordpress\",\"title\":\"WordPress Development\",\"description\":\"Custom themes & plugins\"},{\"id\":\"marketing\",\"title\":\"Digital Marketing\",\"description\":\"SEO, Social Media, Ads\"},{\"id\":\"branding\",\"title\":\"Branding & Design\",\"description\":\"Logo, brand identity\"},{\"id\":\"bulk\",\"title\":\"Bulk Messaging\",\"description\":\"WhatsApp campaigns\"}]}]}},{\"id\":\"ai_fullstack\",\"type\":\"ai_response\",\"x\":100,\"y\":450,\"data\":{\"message\":\"Let me tell you about our Full Stack Development services...\",\"ai_enabled\":true}},{\"id\":\"ai_wordpress\",\"type\":\"ai_response\",\"x\":300,\"y\":450,\"data\":{\"message\":\"Let me tell you about our WordPress services...\",\"ai_enabled\":true}},{\"id\":\"ai_marketing\",\"type\":\"ai_response\",\"x\":500,\"y\":450,\"data\":{\"message\":\"Let me tell you about our Digital Marketing services...\",\"ai_enabled\":true}},{\"id\":\"ai_branding\",\"type\":\"ai_response\",\"x\":700,\"y\":450,\"data\":{\"message\":\"Let me tell you about our Branding services...\",\"ai_enabled\":true}},{\"id\":\"ai_bulk\",\"type\":\"ai_response\",\"x\":900,\"y\":450,\"data\":{\"message\":\"Let me tell you about our Bulk Messaging services...\",\"ai_enabled\":true}},{\"id\":\"end\",\"type\":\"end\",\"x\":600,\"y\":620,\"data\":{\"message\":\"Thank you for your interest!\\n\\nWe look forward to working with you!\"}}],\"edges\":[{\"from\":\"start\",\"to\":\"greet\"},{\"from\":\"greet\",\"to\":\"services\"},{\"from\":\"services\",\"to\":\"ai_fullstack\"},{\"from\":\"services\",\"to\":\"ai_wordpress\"},{\"from\":\"services\",\"to\":\"ai_marketing\"},{\"from\":\"services\",\"to\":\"ai_branding\"},{\"from\":\"services\",\"to\":\"ai_bulk\"},{\"from\":\"ai_fullstack\",\"to\":\"end\"},{\"from\":\"ai_wordpress\",\"to\":\"end\"},{\"from\":\"ai_marketing\",\"to\":\"end\"},{\"from\":\"ai_branding\",\"to\":\"end\"},{\"from\":\"ai_bulk\",\"to\":\"end\"}]}', 1, 1, 'hi,hello,hey,good morning,good evening', '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `flows` (`id`, `owner_id`, `name`, `flow_json`, `active`, `is_published`, `trigger_keyword`, `created_at`, `updated_at`) VALUES (2, 1, 'Lead Capture Flow', '{\"nodes\":[{\"id\":\"start\",\"type\":\"start\",\"x\":400,\"y\":50,\"data\":{\"message\":\"Start\"}},{\"id\":\"ask_name\",\"type\":\"question\",\"x\":400,\"y\":150,\"data\":{\"message\":\"Great! I\'d love to help you.\\n\\nWhat\'s your name?\",\"variable\":\"user_name\",\"options\":[]}},{\"id\":\"ask_service\",\"type\":\"list_message\",\"x\":400,\"y\":280,\"data\":{\"message\":\"Hi! Which service are you interested in?\",\"button_text\":\"Select Service\",\"sections\":[{\"title\":\"Services\",\"rows\":[{\"id\":\"web\",\"title\":\"Website Development\",\"description\":\"Custom websites & apps\"},{\"id\":\"marketing\",\"title\":\"Digital Marketing\",\"description\":\"SEO, Ads, Social Media\"},{\"id\":\"branding\",\"title\":\"Branding & Design\",\"description\":\"Logo, brand identity\"},{\"id\":\"other\",\"title\":\"Other\",\"description\":\"Something else\"}]}]}},{\"id\":\"ask_budget\",\"type\":\"question\",\"x\":400,\"y\":420,\"data\":{\"message\":\"What\'s your budget range?\",\"variable\":\"budget\",\"options\":[]}},{\"id\":\"ask_phone\",\"type\":\"question\",\"x\":400,\"y\":550,\"data\":{\"message\":\"Please share your phone number so our team can reach out:\",\"variable\":\"phone\",\"options\":[]}},{\"id\":\"confirm\",\"type\":\"message\",\"x\":400,\"y\":680,\"data\":{\"message\":\"Thank you! Our team will contact you shortly.\",\"buttons\":[]}},{\"id\":\"end\",\"type\":\"end\",\"x\":400,\"y\":800,\"data\":{\"message\":\"Have a great day!\"}}],\"edges\":[{\"from\":\"start\",\"to\":\"ask_name\"},{\"from\":\"ask_name\",\"to\":\"ask_service\"},{\"from\":\"ask_service\",\"to\":\"ask_budget\"},{\"from\":\"ask_budget\",\"to\":\"ask_phone\"},{\"from\":\"ask_phone\",\"to\":\"confirm\"},{\"from\":\"confirm\",\"to\":\"end\"}]}', 1, 1, 'price,pricing,cost,quote,demo,interested', '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `flows` (`id`, `owner_id`, `name`, `flow_json`, `active`, `is_published`, `trigger_keyword`, `created_at`, `updated_at`) VALUES (3, 1, 'Customer Support Flow', '{\"nodes\":[{\"id\":\"start\",\"type\":\"start\",\"x\":400,\"y\":50,\"data\":{\"message\":\"Start\"}},{\"id\":\"greet\",\"type\":\"message\",\"x\":400,\"y\":150,\"data\":{\"message\":\"Hi there! I\'m here to help you with any issues.\\n\\nWhat do you need help with?\",\"buttons\":[]}},{\"id\":\"category\",\"type\":\"reply_buttons\",\"x\":400,\"y\":280,\"data\":{\"message\":\"Select a category:\",\"buttons\":[{\"id\":\"website\",\"label\":\"Website Issue\"},{\"id\":\"billing\",\"label\":\"Billing\"},{\"id\":\"other\",\"label\":\"Other\"}]}},{\"id\":\"ai_support\",\"type\":\"ai_response\",\"x\":400,\"y\":420,\"data\":{\"message\":\"Let me help you with that...\",\"ai_enabled\":true}},{\"id\":\"escalate\",\"type\":\"message\",\"x\":400,\"y\":560,\"data\":{\"message\":\"I\'ve noted your issue. Our support team will get back to you within 24 hours.\",\"buttons\":[]}},{\"id\":\"end\",\"type\":\"end\",\"x\":400,\"y\":700,\"data\":{\"message\":\"Thank you for reaching out!\"}}],\"edges\":[{\"from\":\"start\",\"to\":\"greet\"},{\"from\":\"greet\",\"to\":\"category\"},{\"from\":\"category\",\"to\":\"ai_support\"},{\"from\":\"ai_support\",\"to\":\"escalate\"},{\"from\":\"escalate\",\"to\":\"end\"}]}', 1, 1, 'support,help,issue,problem,not working,bug', '2026-07-26 07:09:32', '2026-07-26 07:09:32');
INSERT INTO `flows` (`id`, `owner_id`, `name`, `flow_json`, `active`, `is_published`, `trigger_keyword`, `created_at`, `updated_at`) VALUES (4, 1, 'Service Inquiry Flow', '{\"nodes\":[{\"id\":\"start\",\"type\":\"start\",\"x\":400,\"y\":50,\"data\":{\"message\":\"Start\"}},{\"id\":\"greet\",\"type\":\"message\",\"x\":400,\"y\":150,\"data\":{\"message\":\"Hello! I can help you check on your project status.\\n\\nPlease share your project ID or registered email:\",\"buttons\":[]}},{\"id\":\"ask_id\",\"type\":\"question\",\"x\":400,\"y\":280,\"data\":{\"message\":\"Enter your project ID or email:\",\"variable\":\"project_id\",\"options\":[]}},{\"id\":\"ai_status\",\"type\":\"ai_response\",\"x\":400,\"y\":420,\"data\":{\"message\":\"Looking up your project information...\",\"ai_enabled\":true}},{\"id\":\"options\",\"type\":\"reply_buttons\",\"x\":400,\"y\":560,\"data\":{\"message\":\"What would you like to do?\",\"buttons\":[{\"id\":\"talk\",\"label\":\"Talk to Team\"},{\"id\":\"details\",\"label\":\"Project Details\"},{\"id\":\"done\",\"label\":\"That\'s all\"}]}},{\"id\":\"end\",\"type\":\"end\",\"x\":400,\"y\":700,\"data\":{\"message\":\"Thank you!\"}}],\"edges\":[{\"from\":\"start\",\"to\":\"greet\"},{\"from\":\"greet\",\"to\":\"ask_id\"},{\"from\":\"ask_id\",\"to\":\"ai_status\"},{\"from\":\"ai_status\",\"to\":\"options\"},{\"from\":\"options\",\"to\":\"end\"}]}', 1, 1, 'status,order,project,update,progress,delivery', '2026-07-26 07:09:32', '2026-07-26 07:09:32');
INSERT INTO `flows` (`id`, `owner_id`, `name`, `flow_json`, `active`, `is_published`, `trigger_keyword`, `created_at`, `updated_at`) VALUES (5, 1, 'Feedback Collection Flow', '{\"nodes\":[{\"id\":\"start\",\"type\":\"start\",\"x\":400,\"y\":50,\"data\":{\"message\":\"Start\"}},{\"id\":\"greet\",\"type\":\"message\",\"x\":400,\"y\":150,\"data\":{\"message\":\"We value your feedback!\\n\\nYour opinion helps us improve our services.\\n\\nHow was your experience?\",\"buttons\":[]}},{\"id\":\"rating\",\"type\":\"reply_buttons\",\"x\":400,\"y\":280,\"data\":{\"message\":\"Rate your experience:\",\"buttons\":[{\"id\":\"5\",\"label\":\"Excellent\"},{\"id\":\"3\",\"label\":\"Good\"},{\"id\":\"1\",\"label\":\"Needs Improvement\"}]}},{\"id\":\"ask_details\",\"type\":\"question\",\"x\":400,\"y\":420,\"data\":{\"message\":\"Tell us more (optional):\",\"variable\":\"feedback_text\",\"options\":[]}},{\"id\":\"thank\",\"type\":\"message\",\"x\":400,\"y\":560,\"data\":{\"message\":\"Thank you for your feedback!\\n\\nYour input helps us serve you better.\",\"buttons\":[]}},{\"id\":\"end\",\"type\":\"end\",\"x\":400,\"y\":700,\"data\":{\"message\":\"Have a wonderful day!\"}}],\"edges\":[{\"from\":\"start\",\"to\":\"greet\"},{\"from\":\"greet\",\"to\":\"rating\"},{\"from\":\"rating\",\"to\":\"ask_details\"},{\"from\":\"ask_details\",\"to\":\"thank\"},{\"from\":\"thank\",\"to\":\"end\"}]}', 1, 1, 'feedback,review,rate,suggestion,complaint', '2026-07-26 07:09:32', '2026-07-26 07:09:32');

DROP TABLE IF EXISTS `flow_runs`;
CREATE TABLE `flow_runs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flow_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `current_node` varchar(255) DEFAULT NULL,
  `state` longtext  DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_runs_flow_id_foreign` (`flow_id`),
  KEY `flow_runs_contact_id_foreign` (`contact_id`),
  CONSTRAINT `flow_runs_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_runs_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `flow_conversations`;
CREATE TABLE `flow_conversations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `flow_id` bigint(20) unsigned NOT NULL,
  `contact_id` bigint(20) unsigned NOT NULL,
  `owner_id` bigint(20) unsigned NOT NULL,
  `current_node` varchar(255) DEFAULT NULL,
  `context` longtext  DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_conversations_flow_id_foreign` (`flow_id`),
  KEY `flow_conversations_contact_id_foreign` (`contact_id`),
  KEY `flow_conversations_owner_id_foreign` (`owner_id`),
  CONSTRAINT `flow_conversations_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_conversations_flow_id_foreign` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_conversations_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `flow_messages`;
CREATE TABLE `flow_messages` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint(20) unsigned NOT NULL,
  `node_id` varchar(255) DEFAULT NULL,
  `role` enum('user','assistant','button_click') NOT NULL DEFAULT 'user',
  `content` text DEFAULT NULL,
  `button_label` varchar(255) DEFAULT NULL,
  `ai_context` longtext  DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_messages_conversation_id_foreign` (`conversation_id`),
  CONSTRAINT `flow_messages_conversation_id_foreign` FOREIGN KEY (`conversation_id`) REFERENCES `flow_conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `plans`;
CREATE TABLE `plans` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int(11) NOT NULL,
  `max_messages` int(11) DEFAULT NULL,
  `max_contacts` int(11) DEFAULT NULL,
  `features` longtext  DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for plans
INSERT INTO `plans` (`id`, `name`, `description`, `price`, `duration_days`, `max_messages`, `max_contacts`, `features`, `active`, `created_at`, `updated_at`) VALUES (1, 'Basic', 'Perfect for small businesses starting with WhatsApp marketing', 499.00, 30, 1000, 500, '[\"WhatsApp Messaging\",\"Basic Templates\",\"Contact Management\"]', 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `plans` (`id`, `name`, `description`, `price`, `duration_days`, `max_messages`, `max_contacts`, `features`, `active`, `created_at`, `updated_at`) VALUES (2, 'Professional', 'For growing businesses with advanced messaging needs', 999.00, 30, 5000, 2000, '[\"All Basic Features\",\"Bulk Broadcasting\",\"Flow Builder\",\"AI Auto-Reply\",\"Priority Support\"]', 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `plans` (`id`, `name`, `description`, `price`, `duration_days`, `max_messages`, `max_contacts`, `features`, `active`, `created_at`, `updated_at`) VALUES (3, 'Enterprise', 'Unlimited access for large organizations', 2999.00, 30, NULL, NULL, '[\"All Professional Features\",\"Unlimited Messages\",\"Custom AI Agents\",\"Drip Sequences\",\"Dedicated Support\",\"API Access\"]', 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `plan_id` bigint(20) unsigned NOT NULL,
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `starts_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `payment_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id_foreign` (`user_id`),
  KEY `subscriptions_plan_id_foreign` (`plan_id`),
  CONSTRAINT `subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('razorpay','manual') NOT NULL DEFAULT 'manual',
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `added_by` varchar(255) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_owner_id_foreign` (`owner_id`),
  CONSTRAINT `payments_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `pricing_config`;
CREATE TABLE `pricing_config` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `category` varchar(30) NOT NULL,
  `rate` decimal(10,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pricing_config_category_unique` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for pricing_config
INSERT INTO `pricing_config` (`id`, `category`, `rate`, `created_at`, `updated_at`) VALUES (1, 'marketing', 0.9000, '2026-07-26 07:09:29', '2026-07-26 07:09:29');
INSERT INTO `pricing_config` (`id`, `category`, `rate`, `created_at`, `updated_at`) VALUES (2, 'utility', 0.1200, '2026-07-26 07:09:29', '2026-07-26 07:09:29');
INSERT INTO `pricing_config` (`id`, `category`, `rate`, `created_at`, `updated_at`) VALUES (3, 'authentication', 0.1200, '2026-07-26 07:09:29', '2026-07-26 07:09:29');
INSERT INTO `pricing_config` (`id`, `category`, `rate`, `created_at`, `updated_at`) VALUES (4, 'service', 0.0000, '2026-07-26 07:09:29', '2026-07-26 07:09:29');

DROP TABLE IF EXISTS `usage_log`;
CREATE TABLE `usage_log` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `message_id` bigint(20) unsigned DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `cost` decimal(10,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usage_log_owner_id_foreign` (`owner_id`),
  KEY `usage_log_message_id_foreign` (`message_id`),
  CONSTRAINT `usage_log_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usage_log_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'info',
  `reference_id` bigint(20) unsigned DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `canned_responses`;
CREATE TABLE `canned_responses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `shortcut` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `category` varchar(255) DEFAULT NULL,
  `published` tinyint(1) NOT NULL DEFAULT 0,
  `is_preset` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `canned_responses_owner_id_foreign` (`owner_id`),
  CONSTRAINT `canned_responses_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE `campaigns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `template_id` bigint(20) unsigned DEFAULT NULL,
  `contact_ids` longtext  DEFAULT NULL,
  `status` enum('draft','scheduled','running','completed','failed') NOT NULL DEFAULT 'draft',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `total_contacts` int(11) NOT NULL DEFAULT 0,
  `sent_count` int(11) NOT NULL DEFAULT 0,
  `failed_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaigns_owner_id_foreign` (`owner_id`),
  KEY `campaigns_template_id_foreign` (`template_id`),
  CONSTRAINT `campaigns_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `ai_agents`;
CREATE TABLE `ai_agents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `specialty` varchar(255) DEFAULT NULL,
  `system_prompt` text DEFAULT NULL,
  `personality` text DEFAULT NULL,
  `avatar_emoji` varchar(255) NOT NULL DEFAULT '?',
  `is_published` tinyint(1) NOT NULL DEFAULT 0,
  `is_prebuilt` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_agents_owner_id_foreign` (`owner_id`),
  CONSTRAINT `ai_agents_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for ai_agents
INSERT INTO `ai_agents` (`id`, `owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES (1, 1, 'Alex', 'Full Stack Developer', 'React, Node.js, MERN Stack', 'You are Alex, a senior full-stack developer specializing in React, Node.js, and MERN stack development. You help clients with web development projects, provide technical consultations, and explain complex technical concepts in simple terms.', 'Professional, detail-oriented, patient teacher', '👨‍💻', 1, 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `ai_agents` (`id`, `owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES (2, 1, 'Sarah', 'WordPress Expert', 'WordPress, WooCommerce, Themes, Plugins', 'You are Sarah, a WordPress expert specializing in theme customization, plugin development, and WooCommerce solutions. You help clients build and manage their WordPress websites.', 'Friendly, creative, solution-focused', '👩‍💻', 1, 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `ai_agents` (`id`, `owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES (3, 1, 'Raj', 'Digital Marketing Guru', 'SEO, Google Ads, Meta Ads, Social Media Marketing', 'You are Raj, a digital marketing expert specializing in SEO, Google Ads, Meta Ads, and social media marketing. You help clients grow their online presence and reach their target audience.', 'Data-driven, strategic, results-oriented', '📈', 1, 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `ai_agents` (`id`, `owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES (4, 1, 'Priya', 'Bulk Messaging Specialist', 'WhatsApp API, Campaign Management, Template Design', 'You are Priya, a WhatsApp bulk messaging specialist. You help clients create effective WhatsApp campaigns, design templates, and manage their messaging strategy for maximum engagement.', 'Efficient, campaign-savvy, compliance-aware', '💬', 1, 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');
INSERT INTO `ai_agents` (`id`, `owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES (5, 1, 'Design', 'Creative Director', 'Brand Identity, Logo Design, UI/UX', 'You are the Creative Director, specializing in brand identity, logo design, and UI/UX design. You help clients create compelling visual identities and user experiences for their businesses.', 'Creative, visually-oriented, trend-aware', '🎨', 1, 1, '2026-07-26 07:09:31', '2026-07-26 07:09:31');

DROP TABLE IF EXISTS `drip_sequences`;
CREATE TABLE `drip_sequences` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `steps` longtext  DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `drip_sequences_owner_id_foreign` (`owner_id`),
  CONSTRAINT `drip_sequences_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for drip_sequences
INSERT INTO `drip_sequences` (`id`, `owner_id`, `name`, `steps`, `active`, `created_at`, `updated_at`) VALUES (1, 1, 'Welcome New User', '[{\"delay_hours\":0,\"template_name\":\"welcome\",\"message\":\"Welcome to our platform! We are excited to have you on board.\"},{\"delay_hours\":24,\"template_name\":\"tips\",\"message\":\"Here are some tips to get started: 1. Complete your profile 2. Explore our features 3. Connect your WhatsApp number\"},{\"delay_hours\":72,\"template_name\":\"check_in\",\"message\":\"How is your experience so far? We would love to hear your feedback!\"}]', 1, '2026-07-26 07:09:32', '2026-07-26 07:09:32');
INSERT INTO `drip_sequences` (`id`, `owner_id`, `name`, `steps`, `active`, `created_at`, `updated_at`) VALUES (2, 1, 'Follow Up Sequence', '[{\"delay_hours\":0,\"template_name\":\"greeting\",\"message\":\"Hi! Thanks for your interest in our services.\"},{\"delay_hours\":48,\"template_name\":\"follow_up\",\"message\":\"Just checking in \\u2014 do you have any questions about our platform?\"},{\"delay_hours\":168,\"template_name\":\"final\",\"message\":\"Last chance to try our premium features! Special offer ends soon.\"}]', 1, '2026-07-26 07:09:32', '2026-07-26 07:09:32');
INSERT INTO `drip_sequences` (`id`, `owner_id`, `name`, `steps`, `active`, `created_at`, `updated_at`) VALUES (3, 1, 'Re-engagement Campaign', '[{\"delay_hours\":0,\"template_name\":\"miss_you\",\"message\":\"We miss you! It has been a while since your last visit.\"},{\"delay_hours\":72,\"template_name\":\"offer\",\"message\":\"Here is a special 20% discount just for you! Use code WELCOME20.\"}]', 0, '2026-07-26 07:09:32', '2026-07-26 07:09:32');

DROP TABLE IF EXISTS `agents`;
CREATE TABLE `agents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'support',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `agents_owner_id_foreign` (`owner_id`),
  CONSTRAINT `agents_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `chat_assignments`;
CREATE TABLE `chat_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` bigint(20) unsigned NOT NULL,
  `agent_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_assignments_contact_id_foreign` (`contact_id`),
  KEY `chat_assignments_agent_id_foreign` (`agent_id`),
  CONSTRAINT `chat_assignments_agent_id_foreign` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_assignments_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `scheduled_broadcasts`;
CREATE TABLE `scheduled_broadcasts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `template_id` bigint(20) unsigned DEFAULT NULL,
  `template_name` varchar(255) NOT NULL,
  `contact_ids` longtext  DEFAULT NULL,
  `status` enum('pending','processing','completed','sent','failed','cancelled','scheduled') NOT NULL DEFAULT 'pending',
  `scheduled_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `scheduled_broadcasts_owner_id_foreign` (`owner_id`),
  KEY `scheduled_broadcasts_template_id_foreign` (`template_id`),
  CONSTRAINT `scheduled_broadcasts_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scheduled_broadcasts_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `integrations`;
CREATE TABLE `integrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) NOT NULL COMMENT 'telegram, n8n, zapier, webhook',
  `name` varchar(255) NOT NULL,
  `config` longtext  DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `integrations_owner_id_foreign` (`owner_id`),
  CONSTRAINT `integrations_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `contact_labels`;
CREATE TABLE `contact_labels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `owner_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#3B82F6',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contact_labels_owner_id_foreign` (`owner_id`),
  CONSTRAINT `contact_labels_owner_id_foreign` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` longtext DEFAULT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 0,
  `group` varchar(255) NOT NULL DEFAULT 'general',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data for settings
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (1, 'WHATSAPP_APP_ID', '6191a9d838d738ffc9b2d1a15dcf6f4841514c73664f764d596a2b65646f51437a6b6b6239437a383144526d4c496e596b4c494f4c797a637649673d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (2, 'WHATSAPP_APP_SECRET', '76bcd727e9241114ddd84a1494be0f0267594b2b64754545714a6a51364d4165354768426879354d56715049773336595755586e37575236324268756a6f6e6c766d2f326433384463663179526d6449', 1, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (3, 'WHATSAPP_SYSTEM_USER_TOKEN', 'd66c952f28814a8931f40e6d2a10b42e5054474d554f6558706474474e57515a4173734f6d467235477068437249386d757a4e30374342694a6c7a7065636c38757a46566633656e706c784f334b3059514a316e6852334a4c3853586b36486e662b3257345a384b3930686b68592f764849424f4a386367442f486a576f72416373386f336f6346436c44306f313739624b5048743232395137397243334c5a3058345158555876744b6f645056704f7957463838336e784c3344536a74325055425843737a727246503072763666445670327878564136455636747a375a444e4e39716e6f56436a69425031774f4d456737384f58566658335a4f573779487641426e6e5247676f5944744d323774334851596342476e42424e5347486571514a486c64673d3d', 1, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (4, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', '60496ff351ad735d91def59a1e38590d3274626432535264704d6f344d492f777271324c534772724e6c416a55762f414977444e58644a764c6f673d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (5, 'WHATSAPP_CONFIG_ID', 'b33736b006b7f05cd8e1ba2632c4efca564f7833712b6c365750497757474c7850724f614b47435977705876324e36746b7250454135667271414d3d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (6, 'WHATSAPP_GRAPH_API_VERSION', '5c35f9947e749cb373b8f2e04aa210ad7346724754354639726649396a4f433944754c6d47513d3d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (7, 'WHATSAPP_REDIRECT_URI', 'f8a84afc7d9b53131b6ec1c4e12560cc5059314c786e2f704b72704d634b397334763736355562767252634b645a4d737557536d4552417159534f556533547257344f63617744434e55647730684a34', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (8, 'WHATSAPP_PHONE_NUMBER_ID', 'def38a9bcc349f2a89cbaa3b6bdf40fa696f7743765072716959396b2b77326f5a4b3567736b7046332b376849764b4a6937454770395073524d493d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');
INSERT INTO `settings` (`id`, `key`, `value`, `is_secret`, `group`, `created_at`, `updated_at`) VALUES (9, 'WHATSAPP_WABA_ID', 'a899320e1fefa8dee316e22ccd0f0db16545585777736d52354e4b78784f497630594a51424269564677592b624875435a6348576f7a414e6257453d', 0, 'whatsapp', '2026-07-26 07:30:01', '2026-07-26 07:30:01');

SET FOREIGN_KEY_CHECKS = 1;
