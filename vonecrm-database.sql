-- ============================================================
--  VONE DIGITALS CRM — Complete Database Schema
--  Target DB : u615113169_crmmanagement (Hostinger)
--  Import via : phpMyAdmin → u615113169_crmmanagement → Import
--  Generated  : 2026-07-25
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ── 1. users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`       VARCHAR(255)    NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`        ENUM('admin','client') NOT NULL DEFAULT 'client',
  `balance`     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `credit_mode` ENUM('prepaid','postpaid') NOT NULL DEFAULT 'postpaid',
  `created_at`  TIMESTAMP      NULL DEFAULT NULL,
  `updated_at`  TIMESTAMP      NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. whatsapp_numbers ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `whatsapp_numbers` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`            BIGINT UNSIGNED NOT NULL,
  `phone_number_id`     VARCHAR(255)    NOT NULL,
  `waba_id`             VARCHAR(255)    NOT NULL,
  `verified`            TINYINT(1)      NOT NULL DEFAULT 0,
  `status`              ENUM('pending','verified','suspended') NOT NULL DEFAULT 'pending',
  `access_token`        TEXT            DEFAULT NULL,
  `display_phone_number` VARCHAR(255)   DEFAULT NULL,
  `verified_name`       VARCHAR(255)    DEFAULT NULL,
  `added_by`            VARCHAR(255)    DEFAULT NULL,
  `created_at`          TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`          TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_numbers_owner_id_foreign` (`owner_id`),
  CONSTRAINT `whatsapp_numbers_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. contacts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contacts` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`      BIGINT UNSIGNED NOT NULL,
  `name`          VARCHAR(255)    NOT NULL,
  `phone`         VARCHAR(255)    NOT NULL,
  `tags`          JSON            DEFAULT NULL,
  `custom_fields` JSON            DEFAULT NULL,
  `label`         ENUM('new','pending','resolved','archived') DEFAULT NULL,
  `label_id`      BIGINT UNSIGNED DEFAULT NULL,
  `created_at`    TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contacts_owner_id_foreign` (`owner_id`),
  CONSTRAINT `contacts_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. templates ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `templates` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`         BIGINT UNSIGNED NOT NULL,
  `name`             VARCHAR(255)    NOT NULL,
  `category`         ENUM('marketing','utility','authentication') NOT NULL,
  `language`         VARCHAR(255)    NOT NULL DEFAULT 'en_US',
  `header`           TEXT            DEFAULT NULL,
  `body`             TEXT            NOT NULL,
  `footer`           TEXT            DEFAULT NULL,
  `buttons`          JSON            DEFAULT NULL,
  `status`           ENUM('pending','approved','rejected','active') NOT NULL DEFAULT 'pending',
  `meta_template_id` VARCHAR(255)    DEFAULT NULL,
  `is_published`     TINYINT(1)      NOT NULL DEFAULT 0,
  `deleted_at`       TIMESTAMP       NULL DEFAULT NULL,
  `created_at`       TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`       TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `templates_owner_id_foreign` (`owner_id`),
  CONSTRAINT `templates_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `messages` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`     BIGINT UNSIGNED NOT NULL,
  `contact_id`   BIGINT UNSIGNED NOT NULL,
  `direction`    ENUM('inbound','outbound') NOT NULL,
  `body`         TEXT            DEFAULT NULL,
  `template_id`  BIGINT UNSIGNED DEFAULT NULL,
  `wa_message_id` VARCHAR(100)   DEFAULT NULL,
  `status`       VARCHAR(30)     DEFAULT NULL,
  `message_type` VARCHAR(255)    NOT NULL DEFAULT 'text',
  `media_url`    VARCHAR(255)    DEFAULT NULL,
  `label`        VARCHAR(255)    DEFAULT NULL,
  `created_at`   TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_owner_id_foreign`    (`owner_id`),
  KEY `messages_contact_id_foreign`  (`contact_id`),
  KEY `messages_template_id_foreign` (`template_id`),
  CONSTRAINT `messages_owner_id_foreign`
    FOREIGN KEY (`owner_id`)    REFERENCES `users`     (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_contact_id_foreign`
    FOREIGN KEY (`contact_id`)  REFERENCES `contacts`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_template_id_foreign`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 6. flows ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flows` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`        BIGINT UNSIGNED NOT NULL,
  `name`            VARCHAR(255)    NOT NULL,
  `flow_json`       JSON            DEFAULT NULL,
  `active`          TINYINT(1)      NOT NULL DEFAULT 0,
  `is_published`    TINYINT(1)      NOT NULL DEFAULT 0,
  `trigger_keyword` VARCHAR(255)    DEFAULT NULL,
  `created_at`      TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flows_owner_id_foreign` (`owner_id`),
  CONSTRAINT `flows_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 7. flow_runs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flow_runs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `flow_id`      BIGINT UNSIGNED NOT NULL,
  `contact_id`   BIGINT UNSIGNED NOT NULL,
  `current_node` VARCHAR(255)    DEFAULT NULL,
  `state`        JSON            DEFAULT NULL,
  `created_at`   TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_runs_flow_id_foreign`    (`flow_id`),
  KEY `flow_runs_contact_id_foreign` (`contact_id`),
  CONSTRAINT `flow_runs_flow_id_foreign`
    FOREIGN KEY (`flow_id`)    REFERENCES `flows`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_runs_contact_id_foreign`
    FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 8. flow_conversations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flow_conversations` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `flow_id`      BIGINT UNSIGNED NOT NULL,
  `contact_id`   BIGINT UNSIGNED NOT NULL,
  `owner_id`     BIGINT UNSIGNED NOT NULL,
  `current_node` VARCHAR(255)    DEFAULT NULL,
  `context`      JSON            DEFAULT NULL,
  `created_at`   TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_conversations_flow_id_foreign`    (`flow_id`),
  KEY `flow_conversations_contact_id_foreign` (`contact_id`),
  KEY `flow_conversations_owner_id_foreign`   (`owner_id`),
  CONSTRAINT `flow_conversations_flow_id_foreign`
    FOREIGN KEY (`flow_id`)    REFERENCES `flows`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_conversations_contact_id_foreign`
    FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `flow_conversations_owner_id_foreign`
    FOREIGN KEY (`owner_id`)   REFERENCES `users`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 9. flow_messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `flow_messages` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT UNSIGNED NOT NULL,
  `node_id`         VARCHAR(255)    DEFAULT NULL,
  `role`            ENUM('user','assistant','button_click') NOT NULL DEFAULT 'user',
  `content`         TEXT            DEFAULT NULL,
  `button_label`    VARCHAR(255)    DEFAULT NULL,
  `ai_context`      JSON            DEFAULT NULL,
  `created_at`      TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flow_messages_conversation_id_foreign` (`conversation_id`),
  CONSTRAINT `flow_messages_conversation_id_foreign`
    FOREIGN KEY (`conversation_id`) REFERENCES `flow_conversations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 10. plans ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plans` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(255)    NOT NULL,
  `description`   TEXT            DEFAULT NULL,
  `price`         DECIMAL(10,2)   NOT NULL,
  `duration_days` INT             NOT NULL,
  `max_messages`  INT             DEFAULT NULL,
  `max_contacts`  INT             DEFAULT NULL,
  `features`      JSON            DEFAULT NULL,
  `active`        TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 11. subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `plan_id`    BIGINT UNSIGNED NOT NULL,
  `status`     ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `starts_at`  TIMESTAMP       NULL DEFAULT NULL,
  `expires_at` TIMESTAMP       NULL DEFAULT NULL,
  `payment_id` VARCHAR(255)    DEFAULT NULL,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id_foreign` (`user_id`),
  KEY `subscriptions_plan_id_foreign` (`plan_id`),
  CONSTRAINT `subscriptions_user_id_foreign`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_plan_id_foreign`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 12. payments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`             BIGINT UNSIGNED NOT NULL,
  `amount`               DECIMAL(10,2)   NOT NULL,
  `method`               ENUM('razorpay','manual') NOT NULL DEFAULT 'manual',
  `razorpay_payment_id`  VARCHAR(255)    DEFAULT NULL,
  `added_by`             VARCHAR(255)    DEFAULT NULL,
  `note`                 VARCHAR(255)    DEFAULT NULL,
  `created_at`           TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`           TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_owner_id_foreign` (`owner_id`),
  CONSTRAINT `payments_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 13. pricing_config ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pricing_config` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category`   VARCHAR(30)     NOT NULL,
  `rate`       DECIMAL(10,4)   NOT NULL,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pricing_config_category_unique` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default pricing rates (INR)
INSERT IGNORE INTO `pricing_config` (`category`, `rate`, `created_at`, `updated_at`) VALUES
  ('marketing',      0.9000, NOW(), NOW()),
  ('utility',        0.1200, NOW(), NOW()),
  ('authentication', 0.1200, NOW(), NOW()),
  ('service',        0.0000, NOW(), NOW());

-- ── 14. usage_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `usage_log` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED DEFAULT NULL,
  `category`   VARCHAR(255)    NOT NULL,
  `cost`       DECIMAL(10,4)   NOT NULL,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usage_log_owner_id_foreign`   (`owner_id`),
  KEY `usage_log_message_id_foreign` (`message_id`),
  CONSTRAINT `usage_log_owner_id_foreign`
    FOREIGN KEY (`owner_id`)   REFERENCES `users`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_log_message_id_foreign`
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 15. notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `title`        VARCHAR(255)    NOT NULL,
  `message`      TEXT            NOT NULL,
  `type`         VARCHAR(255)    NOT NULL DEFAULT 'info',
  `reference_id` BIGINT UNSIGNED DEFAULT NULL,
  `is_read`      TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`   TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  CONSTRAINT `notifications_user_id_foreign`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 16. canned_responses ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `canned_responses` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `shortcut`   VARCHAR(255)    NOT NULL,
  `message`    TEXT            NOT NULL,
  `category`   VARCHAR(255)    DEFAULT NULL,
  `published`  TINYINT(1)      NOT NULL DEFAULT 0,
  `is_preset`  TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `canned_responses_owner_id_foreign` (`owner_id`),
  CONSTRAINT `canned_responses_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 17. campaigns ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`        BIGINT UNSIGNED NOT NULL,
  `name`            VARCHAR(255)    NOT NULL,
  `template_id`     BIGINT UNSIGNED DEFAULT NULL,
  `contact_ids`     JSON            DEFAULT NULL,
  `status`          ENUM('draft','scheduled','running','completed','failed') NOT NULL DEFAULT 'draft',
  `scheduled_at`    TIMESTAMP       NULL DEFAULT NULL,
  `total_contacts`  INT             NOT NULL DEFAULT 0,
  `sent_count`      INT             NOT NULL DEFAULT 0,
  `failed_count`    INT             NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`      TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `campaigns_owner_id_foreign`    (`owner_id`),
  KEY `campaigns_template_id_foreign` (`template_id`),
  CONSTRAINT `campaigns_owner_id_foreign`
    FOREIGN KEY (`owner_id`)    REFERENCES `users`     (`id`) ON DELETE CASCADE,
  CONSTRAINT `campaigns_template_id_foreign`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 18. ai_agents ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ai_agents` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`      BIGINT UNSIGNED NOT NULL,
  `name`          VARCHAR(255)    NOT NULL,
  `role`          VARCHAR(255)    DEFAULT NULL,
  `specialty`     VARCHAR(255)    DEFAULT NULL,
  `system_prompt` TEXT            DEFAULT NULL,
  `personality`   TEXT            DEFAULT NULL,
  `avatar_emoji`  VARCHAR(255)    NOT NULL DEFAULT '🤖',
  `is_published`  TINYINT(1)      NOT NULL DEFAULT 0,
  `is_prebuilt`   TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ai_agents_owner_id_foreign` (`owner_id`),
  CONSTRAINT `ai_agents_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 19. drip_sequences ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drip_sequences` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `name`       VARCHAR(255)    NOT NULL,
  `steps`      JSON            DEFAULT NULL,
  `active`     TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `drip_sequences_owner_id_foreign` (`owner_id`),
  CONSTRAINT `drip_sequences_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 20. agents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `agents` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `name`       VARCHAR(255)    NOT NULL,
  `email`      VARCHAR(255)    DEFAULT NULL,
  `role`       VARCHAR(255)    NOT NULL DEFAULT 'support',
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `agents_owner_id_foreign` (`owner_id`),
  CONSTRAINT `agents_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 21. chat_assignments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `chat_assignments` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `contact_id` BIGINT UNSIGNED NOT NULL,
  `agent_id`   BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_assignments_contact_id_foreign` (`contact_id`),
  KEY `chat_assignments_agent_id_foreign`   (`agent_id`),
  CONSTRAINT `chat_assignments_contact_id_foreign`
    FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chat_assignments_agent_id_foreign`
    FOREIGN KEY (`agent_id`)   REFERENCES `agents`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 22. scheduled_broadcasts ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `scheduled_broadcasts` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`      BIGINT UNSIGNED NOT NULL,
  `template_id`   BIGINT UNSIGNED DEFAULT NULL,
  `template_name` VARCHAR(255)    NOT NULL,
  `contact_ids`   JSON            DEFAULT NULL,
  `status`        ENUM('pending','processing','completed','sent','failed','cancelled','scheduled') NOT NULL DEFAULT 'pending',
  `scheduled_at`  TIMESTAMP       NOT NULL,
  `created_at`    TIMESTAMP       NULL DEFAULT NULL,
  `updated_at`    TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `scheduled_broadcasts_owner_id_foreign`    (`owner_id`),
  KEY `scheduled_broadcasts_template_id_foreign` (`template_id`),
  CONSTRAINT `scheduled_broadcasts_owner_id_foreign`
    FOREIGN KEY (`owner_id`)    REFERENCES `users`     (`id`) ON DELETE CASCADE,
  CONSTRAINT `scheduled_broadcasts_template_id_foreign`
    FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 23. integrations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `integrations` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `type`       VARCHAR(255)    NOT NULL COMMENT 'telegram, n8n, zapier, webhook',
  `name`       VARCHAR(255)    NOT NULL,
  `config`     JSON            DEFAULT NULL,
  `active`     TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `integrations_owner_id_foreign` (`owner_id`),
  CONSTRAINT `integrations_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 24. contact_labels ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contact_labels` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_id`   BIGINT UNSIGNED NOT NULL,
  `name`       VARCHAR(255)    NOT NULL,
  `color`      VARCHAR(255)    NOT NULL DEFAULT '#3B82F6',
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `contact_labels_owner_id_foreign` (`owner_id`),
  CONSTRAINT `contact_labels_owner_id_foreign`
    FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add label_id FK now that contact_labels exists
ALTER TABLE `contacts`
  ADD CONSTRAINT `contacts_label_id_foreign`
    FOREIGN KEY (`label_id`) REFERENCES `contact_labels` (`id`) ON DELETE SET NULL;

-- ── 25. settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`        VARCHAR(255)    NOT NULL,
  `value`      LONGTEXT        DEFAULT NULL,
  `is_secret`  TINYINT(1)      NOT NULL DEFAULT 0,
  `group`      VARCHAR(255)    NOT NULL DEFAULT 'general',
  `created_at` TIMESTAMP       NULL DEFAULT NULL,
  `updated_at` TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 26. Laravel migrations table (required by artisan) ───────
CREATE TABLE IF NOT EXISTS `migrations` (
  `id`        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` VARCHAR(255) NOT NULL,
  `batch`     INT          NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark all migrations as already run (batch 1)
INSERT IGNORE INTO `migrations` (`migration`, `batch`) VALUES
  ('0001_01_01_000000_create_users_table',                     1),
  ('0001_01_01_000001_create_whatsapp_numbers_table',          1),
  ('0001_01_01_000002_create_contacts_table',                  1),
  ('0001_01_01_000003_create_templates_table',                 1),
  ('0001_01_01_000004_create_messages_table',                  1),
  ('0001_01_01_000005_create_flows_table',                     1),
  ('0001_01_01_000006_create_flow_runs_table',                 1),
  ('0001_01_01_000007_create_flow_conversations_table',        1),
  ('0001_01_01_000008_create_flow_messages_table',             1),
  ('0001_01_01_000009_create_plans_table',                     1),
  ('0001_01_01_000010_create_subscriptions_table',             1),
  ('0001_01_01_000011_create_payments_table',                  1),
  ('0001_01_01_000012_create_pricing_config_table',            1),
  ('0001_01_01_000013_create_usage_log_table',                 1),
  ('0001_01_01_000014_create_notifications_table',             1),
  ('0001_01_01_000015_create_canned_responses_table',          1),
  ('0001_01_01_000016_create_campaigns_table',                 1),
  ('0001_01_01_000017_create_ai_agents_table',                 1),
  ('0001_01_01_000018_create_drip_sequences_table',            1),
  ('0001_01_01_000019_create_agents_table',                    1),
  ('0001_01_01_000020_create_chat_assignments_table',          1),
  ('0001_01_01_000021_create_scheduled_broadcasts_table',      1),
  ('0001_01_01_000022_create_integrations_table',              1),
  ('0001_01_01_000023_create_contact_labels_table',            1),
  ('0001_01_01_000024_create_settings_table',                  1);

-- ────────────────────────────────────────────────────────────
--  SEED DATA
-- ────────────────────────────────────────────────────────────

-- Admin user  (email: admin  |  password: admin123)
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `role`, `balance`, `credit_mode`, `created_at`, `updated_at`)
VALUES (1, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 0.00, 'postpaid', NOW(), NOW());

-- Plans
INSERT IGNORE INTO `plans` (`name`, `description`, `price`, `duration_days`, `max_messages`, `max_contacts`, `features`, `active`, `created_at`, `updated_at`) VALUES
('Basic',        'Perfect for small businesses starting with WhatsApp marketing',
 499,  30, 1000, 500,  '["WhatsApp Messaging","Basic Templates","Contact Management"]', 1, NOW(), NOW()),
('Professional', 'For growing businesses with advanced messaging needs',
 999,  30, 5000, 2000, '["All Basic Features","Bulk Broadcasting","Flow Builder","AI Auto-Reply","Priority Support"]', 1, NOW(), NOW()),
('Enterprise',   'Unlimited access for large organizations',
 2999, 30, NULL, NULL, '["All Professional Features","Unlimited Messages","Custom AI Agents","Drip Sequences","Dedicated Support","API Access"]', 1, NOW(), NOW());

-- Prebuilt AI agents (owner_id = 1 = admin)
INSERT IGNORE INTO `ai_agents` (`owner_id`, `name`, `role`, `specialty`, `system_prompt`, `personality`, `avatar_emoji`, `is_published`, `is_prebuilt`, `created_at`, `updated_at`) VALUES
(1, 'Alex',   'Full Stack Developer',      'React, Node.js, MERN Stack',
 'You are Alex, a senior full-stack developer specializing in React, Node.js, and MERN stack development.',
 'Professional, detail-oriented, patient teacher', '👨‍💻', 1, 1, NOW(), NOW()),
(1, 'Sarah',  'WordPress Expert',          'WordPress, WooCommerce, Themes, Plugins',
 'You are Sarah, a WordPress expert specializing in theme customization, plugin development, and WooCommerce solutions.',
 'Friendly, creative, solution-focused', '👩‍💻', 1, 1, NOW(), NOW()),
(1, 'Raj',    'Digital Marketing Guru',    'SEO, Google Ads, Meta Ads, Social Media Marketing',
 'You are Raj, a digital marketing expert specializing in SEO, Google Ads, Meta Ads, and social media marketing.',
 'Data-driven, strategic, results-oriented', '📈', 1, 1, NOW(), NOW()),
(1, 'Priya',  'Bulk Messaging Specialist', 'WhatsApp API, Campaign Management, Template Design',
 'You are Priya, a WhatsApp bulk messaging specialist.',
 'Efficient, campaign-savvy, compliance-aware', '💬', 1, 1, NOW(), NOW()),
(1, 'Design', 'Creative Director',         'Brand Identity, Logo Design, UI/UX',
 'You are the Creative Director, specializing in brand identity, logo design, and UI/UX design.',
 'Creative, visually-oriented, trend-aware', '🎨', 1, 1, NOW(), NOW());

SET foreign_key_checks = 1;

-- ============================================================
--  DONE! 25 tables created + seed data inserted.
--  Login: email=admin  password=admin123
-- ============================================================
