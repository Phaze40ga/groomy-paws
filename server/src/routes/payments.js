import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const PAYMENT_METHODS = ['card', 'cash', 'cash_app', 'other'];

export default function paymentRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get payments
  router.get('/', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';
      let query, params;

      if (isAdminOrStaff) {
        // Admin/staff can see all payments
        query = `
          SELECT 
            p.*,
            a.scheduled_at,
            a.status as appointment_status,
            u.name as customer_name,
            u.email as customer_email,
            pet.name as pet_name
          FROM payments p
          JOIN appointments a ON p.appointment_id = a.id
          JOIN users u ON a.customer_id = u.id
          JOIN pets pet ON a.pet_id = pet.id
          ORDER BY p.created_at DESC
        `;
        params = [];
      } else {
        // Customers can only see their own payments
        query = `
          SELECT 
            p.*,
            a.scheduled_at,
            a.status as appointment_status,
            pet.name as pet_name
          FROM payments p
          JOIN appointments a ON p.appointment_id = a.id
          JOIN pets pet ON a.pet_id = pet.id
          WHERE a.customer_id = ?
          ORDER BY p.created_at DESC
        `;
        params = [req.user.id];
      }

      const [payments] = await db.execute(query, params);
      res.json({ payments });
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get payment by ID
  router.get('/:id', async (req, res) => {
    try {
      const [payments] = await db.execute(
        `SELECT 
          p.*,
          a.scheduled_at,
          a.status as appointment_status,
          a.customer_id,
          u.name as customer_name,
          u.email as customer_email,
          pet.name as pet_name
        FROM payments p
        JOIN appointments a ON p.appointment_id = a.id
        JOIN users u ON a.customer_id = u.id
        JOIN pets pet ON a.pet_id = pet.id
        WHERE p.id = ?`,
        [req.params.id]
      );

      if (payments.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const payment = payments[0];

      // Check permissions
      if (payment.customer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ payment });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create payment
  router.post('/', async (req, res) => {
    try {
      const {
        appointment_id,
        amount,
        stripe_payment_intent_id,
        payment_method = 'card',
        payment_reference = null,
      } = req.body;

      if (!appointment_id || !amount) {
        return res.status(400).json({ error: 'Appointment ID and amount are required' });
      }

      if (!PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }

      // Verify appointment belongs to user
      const [appointments] = await db.execute(
        'SELECT customer_id, total_price FROM appointments WHERE id = ?',
        [appointment_id]
      );

      if (appointments.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const appointment = appointments[0];

      // Check permissions (customers can only pay for their own appointments)
      if (appointment.customer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Generate UUID for payment
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const paymentId = String(uuidResult[0].id).trim();

      // Create payment
      await db.execute(
        'INSERT INTO payments (id, appointment_id, amount, status, stripe_payment_intent_id, payment_method, payment_reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          paymentId,
          appointment_id,
          amount,
          'paid',
          stripe_payment_intent_id || null,
          payment_method,
          payment_reference,
        ]
      );

      const [payments] = await db.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
      res.status(201).json({ payment: payments[0] });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update payment status (admin/staff only)
  router.put('/:id', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const { status, stripe_payment_intent_id, payment_method, payment_reference } = req.body;

      if (status && !['unpaid', 'paid', 'refunded'].includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' });
      }

      if (payment_method && !PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }

      const updateFields = [];
      const values = [];

      if (status) {
        updateFields.push('status = ?');
        values.push(status);
      }
      if (stripe_payment_intent_id !== undefined) {
        updateFields.push('stripe_payment_intent_id = ?');
        values.push(stripe_payment_intent_id || null);
      }
      if (payment_method) {
        updateFields.push('payment_method = ?');
        values.push(payment_method);
      }
      if (payment_reference !== undefined) {
        updateFields.push('payment_reference = ?');
        values.push(payment_reference || null);
      }

      if (!updateFields.length) {
        return res.status(400).json({ error: 'No valid fields provided' });
      }

      values.push(req.params.id);

      await db.execute(
        `UPDATE payments SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      const [payments] = await db.execute('SELECT * FROM payments WHERE id = ?', [req.params.id]);
      res.json({ payment: payments[0] });
    } catch (error) {
      console.error('Update payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get payments for a specific appointment
  router.get('/appointment/:appointmentId', async (req, res) => {
    try {
      const { appointmentId } = req.params;

      // Verify appointment belongs to user
      const [appointments] = await db.execute(
        'SELECT customer_id FROM appointments WHERE id = ?',
        [appointmentId]
      );

      if (appointments.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const appointment = appointments[0];
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

      // Check permissions
      if (!isAdminOrStaff && appointment.customer_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const [payments] = await db.execute(
        'SELECT * FROM payments WHERE appointment_id = ? ORDER BY created_at DESC',
        [appointmentId]
      );

      res.json({ payments });
    } catch (error) {
      console.error('Get appointment payments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

