import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';

export default function authRoutes(db) {
  const router = express.Router();

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, name, phone } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      // Check if user exists
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate UUID for user
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const userId = uuidResult[0].id;

      // Create user
      await db.execute(
        'INSERT INTO users (id, email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, email, passwordHash, name, phone || null, 'customer']
      );

      // Get created user
      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, profile_picture_url, profile_picture_updated_at, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const [users] = await db.execute(
        'SELECT id, email, password_hash, name, phone, address, role, profile_picture_url, profile_picture_updated_at, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Remove password hash from response
      delete user.password_hash;

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ user, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user
  router.get('/me', authenticateToken, async (req, res) => {
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
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

