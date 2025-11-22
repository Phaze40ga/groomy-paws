import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function customerRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);
  // All routes require admin or staff role
  router.use(requireRole('admin', 'staff'));

  // Get all users with their pet count and appointment count
  router.get('/', async (req, res) => {
    try {
      const [users] = await db.execute(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone,
          u.address,
          u.role,
          u.profile_picture_url,
          u.created_at,
          u.updated_at,
          COUNT(DISTINCT p.id) as pet_count,
          COUNT(DISTINCT a.id) as appointment_count
        FROM users u
        LEFT JOIN pets p ON p.owner_id = u.id
        LEFT JOIN appointments a ON a.customer_id = u.id
        GROUP BY u.id
        ORDER BY 
          CASE u.role
            WHEN 'admin' THEN 1
            WHEN 'staff' THEN 2
            WHEN 'customer' THEN 3
            ELSE 4
          END,
          u.created_at DESC
      `);

      res.json({ customers: users });
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single customer with details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get user info (all roles)
      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = users[0];

      // Get customer's pets
      const [pets] = await db.execute(
        'SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC',
        [id]
      );

      // Get customer's appointments
      const [appointments] = await db.execute(`
        SELECT 
          a.*,
          p.name as pet_name,
          p.breed as pet_breed
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE a.customer_id = ?
        ORDER BY a.scheduled_at DESC
        LIMIT 10
      `, [id]);

      // Get customer's total spent
      const [payments] = await db.execute(`
        SELECT COALESCE(SUM(amount), 0) as total_spent
        FROM payments
        WHERE appointment_id IN (
          SELECT id FROM appointments WHERE customer_id = ?
        )
        AND status = 'paid'
      `, [id]);

      res.json({
        customer: {
          ...customer,
          pet_count: pets.length,
          appointment_count: appointments.length,
          total_spent: payments[0]?.total_spent || 0,
        },
        pets,
        recent_appointments: appointments,
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update customer info (admin only)
  router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, address, role } = req.body;

      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
      }
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address);
      }
      // Allow changing role to admin, staff, or customer (admin only)
      if (role !== undefined && ['admin', 'staff', 'customer'].includes(role)) {
        updateFields.push('role = ?');
        updateValues.push(role);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateValues.push(id);
      // Remove the role restriction from WHERE clause to allow role changes
      await db.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      const [users] = await db.execute(
        'SELECT id, email, name, phone, address, role, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get customer's pets
  router.get('/:id/pets', async (req, res) => {
    try {
      const { id } = req.params;

      const [pets] = await db.execute(
        'SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC',
        [id]
      );

      res.json({ pets });
    } catch (error) {
      console.error('Get customer pets error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get customer's appointments
  router.get('/:id/appointments', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, limit = 50 } = req.query;

      let query = `
        SELECT 
          a.*,
          p.name as pet_name,
          p.breed as pet_breed
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        WHERE a.customer_id = ?
      `;
      const params = [id];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      query += ' ORDER BY a.scheduled_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const [appointments] = await db.execute(query, params);

      res.json({ appointments });
    } catch (error) {
      console.error('Get customer appointments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

