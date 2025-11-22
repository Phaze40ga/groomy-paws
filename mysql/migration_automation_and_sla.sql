-- Automation & SLA tables

CREATE TABLE IF NOT EXISTS automation_workflows (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL,
  minutes_delay INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_automation_workflows_trigger (trigger_type),
  INDEX idx_automation_workflows_active (is_active)
);

CREATE TABLE IF NOT EXISTS automation_workflow_conditions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  workflow_id CHAR(36) NOT NULL,
  condition_text TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_conditions_workflow (workflow_id)
);

CREATE TABLE IF NOT EXISTS automation_workflow_actions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  workflow_id CHAR(36) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  action_config JSON,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_actions_workflow (workflow_id)
);

CREATE TABLE IF NOT EXISTS automation_workflow_runs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  workflow_id CHAR(36) NOT NULL,
  trigger_payload JSON,
  status ENUM('queued', 'running', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  error_message TEXT,
  result_payload JSON,
  queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE,
  INDEX idx_workflow_runs_workflow (workflow_id),
  INDEX idx_workflow_runs_status (status)
);

CREATE TABLE IF NOT EXISTS sla_targets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  threshold_minutes INT NOT NULL,
  warning_minutes INT,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'warning',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sla_targets_entity (entity_type),
  INDEX idx_sla_targets_active (is_active)
);

CREATE TABLE IF NOT EXISTS sla_incidents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  target_id CHAR(36) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  status ENUM('open', 'acknowledged', 'resolved') NOT NULL DEFAULT 'open',
  breach_reason TEXT,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME,
  resolved_at DATETIME,
  resolution_notes TEXT,
  FOREIGN KEY (target_id) REFERENCES sla_targets(id) ON DELETE CASCADE,
  INDEX idx_sla_incidents_target (target_id),
  INDEX idx_sla_incidents_entity (entity_type, entity_id),
  INDEX idx_sla_incidents_status (status)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id CHAR(36) PRIMARY KEY,
  email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
  push_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  category ENUM('message', 'reminder', 'system') NOT NULL DEFAULT 'system',
  title VARCHAR(255),
  body TEXT NOT NULL,
  status ENUM('new', 'read', 'snoozed', 'dismissed') NOT NULL DEFAULT 'new',
  channel_sent JSON,
  metadata JSON,
  snoozed_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_notifications_user (user_id),
  INDEX idx_user_notifications_status (status)
);

