import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function appointmentRoutes(db, deps = {}) {
  const automationService = deps.automationService;
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get appointments
  router.get('/', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';
      let query, params;

      if (isAdminOrStaff) {
        query = `
          SELECT 
            a.*, 
            u.name as customer_name, 
            u.email as customer_email, 
            p.name as pet_name,
            p.breed as pet_breed,
            p.size_category as pet_size_category,
            p.grooming_notes as pet_grooming_notes,
            p.temperament_notes as pet_temperament_notes,
            GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') as service_names
          FROM appointments a
          JOIN users u ON a.customer_id = u.id
          JOIN pets p ON a.pet_id = p.id
          LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
          LEFT JOIN services s ON aps.service_id = s.id
          GROUP BY a.id
          ORDER BY a.scheduled_at DESC
        `;
        params = [];
      } else {
        query = `
          SELECT 
            a.*, 
            p.name as pet_name,
            p.grooming_notes as pet_grooming_notes,
            p.temperament_notes as pet_temperament_notes,
            GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') as service_names
          FROM appointments a
          JOIN pets p ON a.pet_id = p.id
          LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
          LEFT JOIN services s ON aps.service_id = s.id
          WHERE a.customer_id = ?
          GROUP BY a.id
          ORDER BY a.scheduled_at DESC
        `;
        params = [req.user.id];
      }

      const [appointments] = await db.execute(query, params);
      
      // Parse service names into array for each appointment
      const appointmentsWithServices = appointments.map(apt => ({
        ...apt,
        services: apt.service_names ? apt.service_names.split(', ').map((name) => ({ name: name.trim() })) : []
      }));
      
      res.json({ appointments: appointmentsWithServices });
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single appointment
  router.get('/:id', async (req, res) => {
    try {
      const [appointments] = await db.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [req.params.id]
      );

      if (appointments.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const appointment = appointments[0];

      // Check permissions
      if (appointment.customer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ appointment });
    } catch (error) {
      console.error('Get appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create appointment
  router.post('/', async (req, res) => {
    try {
      const { pet_id, scheduled_at, services, total_price, duration_minutes } = req.body;

      console.log('Create appointment request:', { pet_id, scheduled_at, services, total_price, duration_minutes, user_id: req.user?.id });

      if (!pet_id || !scheduled_at || !services || !Array.isArray(services) || services.length === 0) {
        return res.status(400).json({ error: 'Pet ID, scheduled time, and services are required' });
      }

      // Verify pet belongs to user
      const [pets] = await db.execute('SELECT owner_id FROM pets WHERE id = ?', [pet_id]);
      if (pets.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      if (pets[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Pet does not belong to you' });
      }

      // Validate services data
      for (const service of services) {
        if (!service.service_id || service.price === undefined || service.price === null) {
          return res.status(400).json({ error: 'Each service must have a service_id and price' });
        }
      }

      // Generate UUID for appointment
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const appointmentId = String(uuidResult[0].id).trim();

      // Convert scheduled_at to MySQL datetime format if needed
      let scheduledDateTime = scheduled_at;
      if (typeof scheduled_at === 'string' && scheduled_at.includes('T')) {
        // Convert ISO string to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
        // Handle both with and without milliseconds
        scheduledDateTime = scheduled_at
          .replace('T', ' ')
          .replace(/\.\d{3}Z?$/, '')
          .replace(/Z$/, '');
      }

      console.log('Creating appointment with:', {
        appointmentId,
        customer_id: req.user.id,
        pet_id,
        scheduled_at: scheduledDateTime,
        total_price: total_price || 0,
        duration_minutes: duration_minutes || 60
      });

      // Create appointment
      await db.execute(
        'INSERT INTO appointments (id, customer_id, pet_id, scheduled_at, total_price, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [appointmentId, req.user.id, pet_id, scheduledDateTime, total_price || 0, duration_minutes || 60, 'pending']
      );

      // Add appointment services
      for (const service of services) {
        try {
          // Verify service exists
          const [serviceCheck] = await db.execute('SELECT id FROM services WHERE id = ?', [service.service_id]);
          if (serviceCheck.length === 0) {
            throw new Error(`Service ${service.service_id} not found`);
          }

          const [serviceUuidResult] = await db.execute('SELECT UUID() as id');
          const serviceId = String(serviceUuidResult[0].id).trim();
          
          console.log('Adding appointment service:', {
            serviceId,
            appointmentId,
            service_id: service.service_id,
            price: service.price
          });

          await db.execute(
            'INSERT INTO appointment_services (id, appointment_id, service_id, price_at_booking) VALUES (?, ?, ?, ?)',
            [serviceId, appointmentId, service.service_id, service.price]
          );
        } catch (serviceError) {
          console.error('Error adding appointment service:', serviceError);
          console.error('Service error details:', {
            message: serviceError.message,
            code: serviceError.code,
            sqlState: serviceError.sqlState,
            sqlMessage: serviceError.sqlMessage
          });
          // Rollback appointment if service insertion fails
          await db.execute('DELETE FROM appointments WHERE id = ?', [appointmentId]);
          throw serviceError;
        }
      }

      const [appointments] = await db.execute('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
      const createdAppointment = appointments[0];
      res.status(201).json({ appointment: createdAppointment });

      automationService?.enqueueTrigger('appointment_created', {
        appointment_id: createdAppointment.id,
        customer_id: createdAppointment.customer_id,
        status: createdAppointment.status,
        scheduled_at: createdAppointment.scheduled_at,
      }).catch((error) => {
        console.error('Automation trigger error', error);
      });
    } catch (error) {
      console.error('Create appointment error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      });
    }
  });

  // Update appointment (admin/staff only)
  router.put('/:id', requireRole('admin', 'staff'), async (req, res) => {
    try {
      const { status, internal_notes, scheduled_at, duration_minutes } = req.body;
      const appointmentId = req.params.id;

      // Get appointment details before update (to check if status changed)
      const [oldAppointments] = await db.execute(`
        SELECT a.*, p.name as pet_name, u.name as customer_name, u.email as customer_email
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users u ON a.customer_id = u.id
        WHERE a.id = ?
      `, [appointmentId]);

      if (oldAppointments.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const oldAppointment = oldAppointments[0];
      const oldStatus = oldAppointment.status;

      const updateFields = [];
      const updateValues = [];

      if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      if (internal_notes !== undefined) {
        updateFields.push('internal_notes = ?');
        updateValues.push(internal_notes || null);
      }

      if (scheduled_at) {
        let scheduledDateTime = scheduled_at;
        if (typeof scheduled_at === 'string') {
          scheduledDateTime = scheduled_at
            .replace('T', ' ')
            .replace(/\.\d{3}Z?$/, '')
            .replace(/Z$/, '');
        }
        updateFields.push('scheduled_at = ?');
        updateValues.push(scheduledDateTime);
      }

      if (duration_minutes !== undefined) {
        updateFields.push('duration_minutes = ?');
        updateValues.push(duration_minutes);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      updateValues.push(appointmentId);

      await db.execute(
        `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      const [appointments] = await db.execute(`
        SELECT 
          a.*, 
          p.name as pet_name, 
          p.grooming_notes as pet_grooming_notes,
          p.temperament_notes as pet_temperament_notes,
          u.name as customer_name, 
          u.email as customer_email,
          GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') as service_names
        FROM appointments a
        JOIN pets p ON a.pet_id = p.id
        JOIN users u ON a.customer_id = u.id
        LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
        LEFT JOIN services s ON aps.service_id = s.id
        WHERE a.id = ?
        GROUP BY
          a.id,
          p.name,
          p.grooming_notes,
          p.temperament_notes,
          u.name,
          u.email
      `, [appointmentId]);

      const updatedAppointment = {
        ...appointments[0],
        services: appointments[0].service_names
          ? appointments[0].service_names.split(', ').map((name) => ({ name: name.trim() }))
          : []
      };

      res.json({ appointment: updatedAppointment });

      if (status && status !== oldStatus) {
        automationService?.enqueueTrigger('appointment_status_changed', {
          appointment_id: appointmentId,
          previous_status: oldStatus,
          status,
          customer_id: updatedAppointment.customer_id,
          scheduled_at: updatedAppointment.scheduled_at,
        }).catch((error) => console.error('Automation trigger error', error));

        if (oldStatus === 'pending') {
          automationService?.closeIncidentsForEntity('appointment.pending', appointmentId)
            .catch((error) => console.error('Close SLA incident error', error));
        }
      }
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

