import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

function mapWorkflowRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger: row.trigger_type,
    minutes_delay: row.minutes_delay,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    conditions: (row.conditions || []).map((condition) =>
      typeof condition === 'string' ? condition : condition.condition_text
    ),
    actions: (row.actions || []).map((action) => ({
      id: action.id,
      action_type: action.action_type,
      action_config:
        typeof action.action_config === 'string'
          ? JSON.parse(action.action_config)
          : action.action_config,
    })),
  };
}

export default function automationRoutes(db, automationService) {
  const router = express.Router();
  router.use(authenticateToken);
  router.use(requireRole('admin', 'staff'));

  async function getWorkflow(id) {
    const [rows] = await db.execute(
      'SELECT * FROM automation_workflows WHERE id = ?',
      [id]
    );
    const workflow = rows[0];
    if (!workflow) return null;
    const [conditions] = await db.execute(
      'SELECT id, condition_text, position FROM automation_workflow_conditions WHERE workflow_id = ? ORDER BY position ASC',
      [id]
    );
    const [actions] = await db.execute(
      'SELECT id, action_type, action_config, position FROM automation_workflow_actions WHERE workflow_id = ? ORDER BY position ASC',
      [id]
    );
    return {
      ...workflow,
      conditions,
      actions: actions.map((action) => ({
        ...action,
        action_config: action.action_config ? JSON.parse(action.action_config) : null,
      })),
    };
  }

  router.get('/workflows', async (_req, res) => {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM automation_workflows ORDER BY created_at DESC'
      );
      const workflows = [];
      for (const row of rows) {
        const workflow = await getWorkflow(row.id);
        workflows.push(mapWorkflowRow(workflow));
      }
      res.json({ workflows });
    } catch (error) {
      console.error('List workflows error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/workflows', async (req, res) => {
    try {
      const { name, description, trigger, minutes_delay, is_active, conditions, actions } =
        req.body;
      if (!name || !trigger) {
        return res.status(400).json({ error: 'Name and trigger are required' });
      }

      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const workflowId = String(uuidResult[0].id).trim();

      await db.execute(
        `
          INSERT INTO automation_workflows
            (id, name, description, trigger_type, minutes_delay, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          workflowId,
          name,
          description || null,
          trigger,
          minutes_delay ?? null,
          is_active ? 1 : 0,
        ]
      );

      await saveConditions(workflowId, conditions || []);
      await saveActions(workflowId, actions || []);

      const workflow = await getWorkflow(workflowId);
      res.status(201).json({ workflow: mapWorkflowRow(workflow) });
    } catch (error) {
      console.error('Create workflow error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await getWorkflow(id);
      if (!existing) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      const { name, description, trigger, minutes_delay, is_active, conditions, actions } =
        req.body;

      await db.execute(
        `
          UPDATE automation_workflows
          SET name = ?, description = ?, trigger_type = ?, minutes_delay = ?, is_active = ?
          WHERE id = ?
        `,
        [
          name || existing.name,
          description || existing.description,
          trigger || existing.trigger_type,
          minutes_delay ?? existing.minutes_delay,
          typeof is_active === 'boolean' ? (is_active ? 1 : 0) : existing.is_active,
          id,
        ]
      );

      await db.execute('DELETE FROM automation_workflow_conditions WHERE workflow_id = ?', [
        id,
      ]);
      await db.execute('DELETE FROM automation_workflow_actions WHERE workflow_id = ?', [
        id,
      ]);

      await saveConditions(id, conditions || []);
      await saveActions(id, actions || []);

      const workflow = await getWorkflow(id);
      res.json({ workflow: mapWorkflowRow(workflow) });
    } catch (error) {
      console.error('Update workflow error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.patch('/workflows/:id/toggle', async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      await db.execute(
        `
          UPDATE automation_workflows
          SET is_active = ?
          WHERE id = ?
        `,
        [is_active ? 1 : 0, id]
      );
      const workflow = await getWorkflow(id);
      res.json({ workflow: mapWorkflowRow(workflow) });
    } catch (error) {
      console.error('Toggle workflow error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/workflows/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute('DELETE FROM automation_workflows WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete workflow error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/runs', async (_req, res) => {
    try {
      const [runs] = await db.execute(
        `
          SELECT r.*, w.name as workflow_name
          FROM automation_workflow_runs r
          JOIN automation_workflows w ON r.workflow_id = w.id
          ORDER BY r.queued_at DESC
          LIMIT 50
        `
      );
      res.json({ runs });
    } catch (error) {
      console.error('List runs error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/triggers/:triggerType', async (req, res) => {
    try {
      const { triggerType } = req.params;
      await automationService.enqueueTrigger(triggerType, req.body || {});
      res.status(202).json({ queued: true });
    } catch (error) {
      console.error('Trigger workflow error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/sla/targets', async (_req, res) => {
    try {
      const [targets] = await db.execute('SELECT * FROM sla_targets');
      res.json({ targets });
    } catch (error) {
      console.error('List SLA targets error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/sla/targets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { threshold_minutes, warning_minutes, severity, is_active } = req.body;
      await db.execute(
        `
          UPDATE sla_targets
          SET threshold_minutes = ?, warning_minutes = ?, severity = ?, is_active = ?
          WHERE id = ?
        `,
        [threshold_minutes, warning_minutes, severity, is_active ? 1 : 0, id]
      );
      const [targets] = await db.execute('SELECT * FROM sla_targets WHERE id = ?', [id]);
      res.json({ target: targets[0] });
    } catch (error) {
      console.error('Update SLA target error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/sla/incidents', async (_req, res) => {
    try {
      const [incidents] = await db.execute(
        `
          SELECT i.*, t.name as target_name
          FROM sla_incidents i
          JOIN sla_targets t ON i.target_id = t.id
          ORDER BY i.opened_at DESC
          LIMIT 100
        `
      );
      res.json({ incidents });
    } catch (error) {
      console.error('List SLA incidents error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/metrics', async (_req, res) => {
    try {
      const [[pendingOver24h]] = await db.execute(
        `
          SELECT COUNT(*) as count
          FROM appointments
          WHERE status = 'pending' AND TIMESTAMPDIFF(HOUR, scheduled_at, NOW()) > 24
        `
      );
      const [[inProgressOverrun]] = await db.execute(
        `
          SELECT COUNT(*) as count
          FROM appointments
          WHERE status = 'in_progress'
            AND TIMESTAMPDIFF(MINUTE, scheduled_at, NOW()) > duration_minutes + 30
        `
      );
      const [[chatAwaiting]] = await db.execute(
        `
          SELECT COUNT(*) as count
          FROM conversations
          WHERE TIMESTAMPDIFF(MINUTE, last_message_at, NOW()) > 30
        `
      );

      const [recentRuns] = await db.execute(
        `
          SELECT r.*, w.name as workflow_name
          FROM automation_workflow_runs r
          JOIN automation_workflows w ON r.workflow_id = w.id
          ORDER BY r.queued_at DESC
          LIMIT 10
        `
      );

      res.json({
        metrics: {
          pending_over_24h: pendingOver24h.count,
          in_progress_overrun: inProgressOverrun.count,
          chats_awaiting_reply: chatAwaiting.count,
        },
        recentRuns,
      });
    } catch (error) {
      console.error('Automation metrics error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  async function saveConditions(workflowId, conditions) {
    if (!conditions || !conditions.length) return;
    for (let index = 0; index < conditions.length; index += 1) {
      const condition = conditions[index];
      if (!condition) continue;
      await db.execute(
        `
          INSERT INTO automation_workflow_conditions (id, workflow_id, condition_text, position)
          VALUES (UUID(), ?, ?, ?)
        `,
        [workflowId, condition, index]
      );
    }
  }

  async function saveActions(workflowId, actions) {
    if (!actions || !actions.length) return;
    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      await db.execute(
        `
          INSERT INTO automation_workflow_actions (id, workflow_id, action_type, action_config, position)
          VALUES (UUID(), ?, ?, ?, ?)
        `,
        [
          workflowId,
          action.action_type || action.actionType || 'send_notification',
          JSON.stringify(action.action_config || action.actionConfig || {}),
          index,
        ]
      );
    }
  }

  return router;
}

