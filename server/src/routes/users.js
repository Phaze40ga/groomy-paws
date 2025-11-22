import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function userRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Update online status
  router.post('/online', async (req, res) => {
    try {
      await db.execute(
        'UPDATE users SET is_online = TRUE, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.user.id]
      );
      res.json({ message: 'Online status updated' });
    } catch (error) {
      console.error('Update online status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user profile
  router.get('/profile', async (req, res) => {
    try {
      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, profile_picture_url, profile_picture_updated_at, is_online, last_seen_at, created_at, updated_at FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  router.put('/profile', async (req, res) => {
    try {
      const { name, phone, address } = req.body;

      await db.execute(
        'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
        [name, phone, address, req.user.id]
      );

      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, profile_picture_url, profile_picture_updated_at, created_at, updated_at FROM users WHERE id = ?',
        [req.user.id]
      );

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all users (admin/staff only)
  router.get('/', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, created_at, updated_at FROM users'
      );

      res.json({ users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

