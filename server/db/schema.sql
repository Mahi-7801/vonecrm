CREATE DATABASE IF NOT EXISTS whatsapp_crm;
USE whatsapp_crm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','client') DEFAULT 'client',
  balance DECIMAL(10,2) DEFAULT 0,
  credit_mode ENUM('prepaid','postpaid') DEFAULT 'postpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  phone_number_id VARCHAR(50),
  waba_id VARCHAR(50),
  verified BOOLEAN DEFAULT FALSE,
  status ENUM('pending','verified','suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  tags JSON,
  custom_fields JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  contact_id INT,
  direction ENUM('inbound','outbound'),
  body TEXT,
  template_id INT,
  wa_message_id VARCHAR(100),
  status VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(255),
  category ENUM('marketing','utility','authentication'),
  language VARCHAR(10) DEFAULT 'en',
  header TEXT,
  body TEXT,
  footer TEXT,
  buttons JSON,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  meta_template_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS flows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(255),
  flow_json JSON,
  active BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS flow_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flow_id INT,
  contact_id INT,
  current_node VARCHAR(100),
  state JSON,
  FOREIGN KEY (flow_id) REFERENCES flows(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS usage_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  message_id INT,
  category VARCHAR(30),
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  amount DECIMAL(10,2),
  method ENUM('razorpay','manual'),
  razorpay_payment_id VARCHAR(100),
  added_by INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT,
  agent_id INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL DEFAULT 30,
  max_messages INT DEFAULT -1,
  max_contacts INT DEFAULT -1,
  features JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('active','expired','cancelled') DEFAULT 'active',
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  payment_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE IF NOT EXISTS pricing_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(30) UNIQUE NOT NULL,
  rate DECIMAL(10,4) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default pricing (Meta base rates INR — admin can override via /api/admin/pricing)
INSERT IGNORE INTO pricing_config (category, rate) VALUES
  ('marketing', 0.90),
  ('utility', 0.12),
  ('authentication', 0.12),
  ('service', 0.00);

CREATE TABLE IF NOT EXISTS flow_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flow_id INT NOT NULL,
  contact_id INT,
  owner_id INT NOT NULL,
  current_node VARCHAR(100),
  context JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES flows(id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS flow_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  node_id VARCHAR(100),
  role ENUM('user','assistant','button_click') NOT NULL,
  content TEXT,
  button_label VARCHAR(255),
  ai_context JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES flow_conversations(id) ON DELETE CASCADE
);
