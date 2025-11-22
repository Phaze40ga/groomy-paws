import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

export default function notificationsRoutes(db, dispatcher) {
  const router = express.Router();
  router.use(authenticateToken);

  router.get('/', async (req, res) => {
    try {
      const notifications = await dispatcher.listNotifications(req.user.id, {
        status: req.query.status,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json({ notifications });
    } catch (error) {
      console.error('List notifications error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { title, body, category, metadata } = req.body;
      if (!body) {
        return res.status(400).json({ error: 'Body is required' });
      }
      const notification = await dispatcher.createNotification(req.user.id, {
        title,
        body,
        category,
        metadata,
      });
      res.status(201).json({ notification });
    } catch (error) {
      console.error('Create notification error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/read', async (req, res) => {
    try {
      const { id } = req.params;
      await dispatcher.updateNotificationStatus(req.user.id, id, 'read');
      res.json({ success: true });
    } catch (error) {
      console.error('Mark read error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/snooze', async (req, res) => {
    try {
      const { id } = req.params;
      const minutes = Number(req.body.minutes || 60);
      const snoozedUntil = new Date(Date.now() + minutes * 60000).toISOString().slice(0, 19).replace('T', ' ');
      await dispatcher.updateNotificationStatus(req.user.id, id, 'snoozed', {
        snoozed_until: snoozedUntil,
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Snooze error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/:id/dismiss', async (req, res) => {
    try {
      const { id } = req.params;
      await dispatcher.updateNotificationStatus(req.user.id, id, 'dismissed');
      res.json({ success: true });
    } catch (error) {
      console.error('Dismiss error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/preferences/me', async (req, res) => {
    try {
      const prefs = await dispatcher.getPreferences(req.user.id);
      res.json({ preferences: prefs });
    } catch (error) {
      console.error('Get preferences error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/preferences/me', async (req, res) => {
    try {
      const prefs = await dispatcher.updatePreferences(req.user.id, req.body || {});
      res.json({ preferences: prefs });
    } catch (error) {
      console.error('Update preferences error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

