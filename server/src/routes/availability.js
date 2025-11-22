import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function availabilityRoutes(db) {
  const router = express.Router();

  // Public endpoint to get all admin/staff availability (for customers to see available times)
  router.get('/public', async (req, res) => {
    try {
      // Get availability for all admin/staff users
      const [slots] = await db.execute(
        `SELECT a.*, u.name as user_name, u.role 
         FROM availability a
         JOIN users u ON a.user_id = u.id
         WHERE u.role IN ('admin', 'staff') AND a.is_available = TRUE
         ORDER BY a.day_of_week, a.start_time`
      );
      res.json({ availability: slots });
    } catch (error) {
      console.error('Get public availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin/staff routes require authentication and role
  router.use(authenticateToken);
  router.use(requireRole('admin', 'staff'));

  // Get availability for current user
  router.get('/', async (req, res) => {
    try {
      const [slots] = await db.execute(
        'SELECT * FROM availability WHERE user_id = ? ORDER BY day_of_week, start_time',
        [req.user.id]
      );
      res.json({ availability: slots });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Set availability for a specific day
  router.post('/', async (req, res) => {
    try {
      const { day_of_week, start_time, end_time, is_available } = req.body;

      if (day_of_week === undefined || day_of_week === null) {
        return res.status(400).json({ error: 'day_of_week is required' });
      }
      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' });
      }

      // Check if availability already exists for this day
      const [existing] = await db.execute(
        'SELECT * FROM availability WHERE user_id = ? AND day_of_week = ?',
        [req.user.id, day_of_week]
      );

      if (existing.length > 0) {
        // Update existing
        await db.execute(
          'UPDATE availability SET start_time = ?, end_time = ?, is_available = ? WHERE user_id = ? AND day_of_week = ?',
          [start_time || '09:00', end_time || '17:00', is_available !== undefined ? is_available : true, req.user.id, day_of_week]
        );
        const [updated] = await db.execute(
          'SELECT * FROM availability WHERE user_id = ? AND day_of_week = ?',
          [req.user.id, day_of_week]
        );
        res.json({ availability: updated[0] });
      } else {
        // Create new
        const [uuidResult] = await db.execute('SELECT UUID() as id');
        const slotId = String(uuidResult[0].id).trim();

        await db.execute(
          'INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [slotId, req.user.id, day_of_week, start_time || '09:00', end_time || '17:00', is_available !== undefined ? is_available : true]
        );

        const [newSlot] = await db.execute(
          'SELECT * FROM availability WHERE id = ?',
          [slotId]
        );
        res.status(201).json({ availability: newSlot[0] });
      }
    } catch (error) {
      console.error('Set availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete availability for a specific day
  router.delete('/:dayOfWeek', async (req, res) => {
    try {
      const dayOfWeek = parseInt(req.params.dayOfWeek);
      
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: 'Invalid day_of_week' });
      }

      await db.execute(
        'DELETE FROM availability WHERE user_id = ? AND day_of_week = ?',
        [req.user.id, dayOfWeek]
      );

      res.json({ message: 'Availability deleted' });
    } catch (error) {
      console.error('Delete availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

