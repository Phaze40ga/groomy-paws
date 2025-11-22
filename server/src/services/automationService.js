export class AutomationService {
  constructor(db, dispatcher, options = {}) {
    this.db = db;
    this.dispatcher = dispatcher;
    this.pollIntervalMs = Number(process.env.AUTOMATION_POLL_INTERVAL_MS || 15000);
    this.slaIntervalMs = Number(process.env.SLA_EVALUATION_INTERVAL_MS || 60000);
    this.processingRuns = false;
    this.processingSla = false;
    this.logger = options.logger || console;
    this.start();
  }

  start() {
    this.runTimer = setInterval(() => {
      this.processPendingRuns().catch((err) =>
        this.logger.error('processPendingRuns error', err)
      );
    }, this.pollIntervalMs);

    this.slaTimer = setInterval(() => {
      this.evaluateSlaTargets().catch((err) =>
        this.logger.error('evaluateSlaTargets error', err)
      );
    }, this.slaIntervalMs);
  }

  async enqueueTrigger(triggerType, payload = {}) {
    if (!triggerType) return;
    const [workflows] = await this.db.execute(
      `
        SELECT id, minutes_delay
        FROM automation_workflows
        WHERE trigger_type = ? AND is_active = 1
      `,
      [triggerType]
    );

    if (!workflows.length) {
      return;
    }

    const triggerPayload = JSON.stringify({
      triggerType,
      ...payload,
    });

    for (const workflow of workflows) {
      await this.db.execute(
        `
          INSERT INTO automation_workflow_runs
            (id, workflow_id, trigger_payload, status, queued_at)
          VALUES (UUID(), ?, ?, 'queued', CURRENT_TIMESTAMP)
        `,
        [workflow.id, triggerPayload]
      );
    }
  }

  async processPendingRuns() {
    if (this.processingRuns) return;
    this.processingRuns = true;
    try {
      const [runs] = await this.db.execute(
        `
          SELECT
            r.*,
            w.name as workflow_name,
            w.trigger_type,
            w.minutes_delay
          FROM automation_workflow_runs r
          JOIN automation_workflows w ON r.workflow_id = w.id
          WHERE r.status = 'queued'
            AND (
              w.minutes_delay IS NULL
              OR TIMESTAMPADD(MINUTE, w.minutes_delay, r.queued_at) <= NOW()
            )
          ORDER BY r.queued_at ASC
          LIMIT 10
        `
      );

      for (const run of runs) {
        await this.executeRun(run);
      }
    } finally {
      this.processingRuns = false;
    }
  }

  async executeRun(run) {
    await this.db.execute(
      `
        UPDATE automation_workflow_runs
        SET status = 'running', started_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'queued'
      `,
      [run.id]
    );

    const payload = run.trigger_payload ? JSON.parse(run.trigger_payload) : {};
    try {
      const [actions] = await this.db.execute(
        `
          SELECT action_type, action_config
          FROM automation_workflow_actions
          WHERE workflow_id = ?
          ORDER BY position ASC
        `,
        [run.workflow_id]
      );

      const results = [];
      for (const action of actions) {
        const config = action.action_config ? JSON.parse(action.action_config) : {};
        const result = await this.executeAction(action.action_type, config, payload);
        results.push({ action: action.action_type, result });
      }

      await this.db.execute(
        `
          UPDATE automation_workflow_runs
          SET status = 'completed',
              completed_at = CURRENT_TIMESTAMP,
              result_payload = ?
          WHERE id = ?
        `,
        [JSON.stringify(results), run.id]
      );
    } catch (error) {
      await this.db.execute(
        `
          UPDATE automation_workflow_runs
          SET status = 'failed',
              completed_at = CURRENT_TIMESTAMP,
              error_message = ?
          WHERE id = ?
        `,
        [error.message, run.id]
      );
      this.logger.error('Workflow run failed', error);
    }
  }

  async executeAction(actionType, config, payload) {
    switch (actionType) {
      case 'send_notification': {
        const targetUserId = config.user_id || payload.customer_id || payload.user_id;
        if (!targetUserId) {
          return { skipped: 'Missing target user id' };
        }
        await this.dispatcher.sendNotification({
          userId: targetUserId,
          title: config.title || payload.title || 'Automation',
          body:
            config.body ||
            payload.message ||
            'An automation workflow sent this notification.',
          category: config.category || 'system',
          metadata: { workflow: config.workflowName, payload },
        });
        return { sent: true };
      }
      case 'update_status': {
        if (!payload.appointment_id || !config.next_status) {
          return { skipped: 'Missing appointment or status' };
        }
        await this.db.execute(
          `
            UPDATE appointments
            SET status = ?
            WHERE id = ?
          `,
          [config.next_status, payload.appointment_id]
        );
        return { updated: true };
      }
      case 'create_task':
      case 'assign_owner':
      default:
        return { skipped: `Action ${actionType} not implemented` };
    }
  }

  async evaluateSlaTargets() {
    if (this.processingSla) return;
    this.processingSla = true;
    try {
      const [targets] = await this.db.execute(
        'SELECT * FROM sla_targets WHERE is_active = 1'
      );
      for (const target of targets) {
        await this.evaluateTarget(target);
      }
    } finally {
      this.processingSla = false;
    }
  }

  async evaluateTarget(target) {
    let breachIds = [];
    if (target.entity_type === 'appointment.pending') {
      const [rows] = await this.db.execute(
        `
          SELECT id
          FROM appointments
          WHERE status = 'pending'
            AND TIMESTAMPDIFF(MINUTE, scheduled_at, NOW()) > ?
        `,
        [target.threshold_minutes]
      );
      breachIds = rows.map((row) => row.id);
    } else if (target.entity_type === 'chat.unanswered') {
      const [rows] = await this.db.execute(
        `
          SELECT c.id
          FROM conversations c
          JOIN (
            SELECT conversation_id, sender_id, created_at
            FROM messages
            ORDER BY created_at DESC
          ) m ON c.id = m.conversation_id
          WHERE TIMESTAMPDIFF(MINUTE, c.last_message_at, NOW()) > ?
        `,
        [target.threshold_minutes]
      );
      breachIds = rows.map((row) => row.id);
    }

    await this.syncIncidents(target, breachIds);
  }

  async syncIncidents(target, breachIds) {
    const entityType = target.entity_type;
    const [openIncidents] = await this.db.execute(
      `
        SELECT id, entity_id
        FROM sla_incidents
        WHERE target_id = ? AND status IN ('open', 'acknowledged')
      `,
      [target.id]
    );

    const activeSet = new Set(breachIds);
    const openSet = new Set(openIncidents.map((incident) => incident.entity_id));

    for (const entityId of breachIds) {
      if (!openSet.has(entityId)) {
        await this.db.execute(
          `
            INSERT INTO sla_incidents
              (id, target_id, entity_type, entity_id, status, breach_reason, opened_at)
            VALUES (UUID(), ?, ?, ?, 'open', ?, CURRENT_TIMESTAMP)
          `,
          [target.id, entityType, entityId, `Breach detected for ${entityType}`]
        );
      }
    }

    for (const incident of openIncidents) {
      if (!activeSet.has(incident.entity_id)) {
        await this.db.execute(
          `
            UPDATE sla_incidents
            SET status = 'resolved',
                resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [incident.id]
        );
      }
    }
  }

  async closeIncidentsForEntity(entityType, entityId) {
    await this.db.execute(
      `
        UPDATE sla_incidents
        SET status = 'resolved',
            resolved_at = CURRENT_TIMESTAMP
        WHERE entity_type = ? AND entity_id = ? AND status IN ('open', 'acknowledged')
      `,
      [entityType, entityId]
    );
  }
}

