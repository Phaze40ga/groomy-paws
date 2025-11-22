import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function serviceRoutes(db) {
  const router = express.Router();

  // Get services (public for authenticated users)
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const [services] = await db.execute(
        'SELECT * FROM services WHERE is_active = TRUE ORDER BY name'
      );
      res.json({ services });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get service prices
  router.get('/:id/prices', authenticateToken, async (req, res) => {
    try {
      // Try breed column first, fallback to size_category for migration compatibility
      let prices;
      try {
        [prices] = await db.execute(
          'SELECT * FROM service_prices WHERE service_id = ? ORDER BY breed',
          [req.params.id]
        );
      } catch (err) {
        // If breed column doesn't exist, try size_category
        try {
          [prices] = await db.execute(
            'SELECT * FROM service_prices WHERE service_id = ? ORDER BY size_category',
            [req.params.id]
          );
          // Convert size_category to breed format for compatibility
          prices = prices.map(p => ({
            ...p,
            breed: p.size_category || 'Standard',
            size_category: undefined
          }));
        } catch (err2) {
          console.error('Error loading prices:', err2);
          prices = [];
        }
      }
      res.json({ prices });
    } catch (error) {
      console.error('Get prices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin routes
  router.use(authenticateToken);
  router.use(requireRole('admin'));

  // Create service
  router.post('/', async (req, res) => {
    try {
      const { name, description, base_price, duration_minutes, is_addon, is_active } = req.body;

      // Generate UUID for service
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const serviceId = String(uuidResult[0].id).trim();

      await db.execute(
        'INSERT INTO services (id, name, description, base_price, duration_minutes, is_addon, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [serviceId, name, description || null, base_price || 0, duration_minutes || 60, is_addon || false, is_active !== undefined ? is_active : true]
      );

      const [services] = await db.execute('SELECT * FROM services WHERE id = ?', [serviceId]);
      res.status(201).json({ service: services[0] });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update service
  router.put('/:id', async (req, res) => {
    try {
      const { name, description, base_price, duration_minutes, is_addon, is_active } = req.body;

      await db.execute(
        'UPDATE services SET name = ?, description = ?, base_price = ?, duration_minutes = ?, is_addon = ?, is_active = ? WHERE id = ?',
        [name, description || null, base_price, duration_minutes, is_addon, is_active, req.params.id]
      );

      const [services] = await db.execute('SELECT * FROM services WHERE id = ?', [req.params.id]);
      res.json({ service: services[0] });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add or update service price
  router.post('/:id/prices', async (req, res) => {
    try {
      const { breed, price } = req.body;

      if (!breed || price === undefined || price === null) {
        return res.status(400).json({ error: 'Breed and price are required' });
      }

      // Check if breed column exists, otherwise use size_category
      let hasBreedColumn = false;
      try {
        const [columns] = await db.execute("SHOW COLUMNS FROM service_prices LIKE 'breed'");
        hasBreedColumn = columns.length > 0;
      } catch (err) {
        // Table might not exist or error checking
      }

      if (hasBreedColumn) {
        // Use breed column
        const [existing] = await db.execute(
          'SELECT * FROM service_prices WHERE service_id = ? AND breed = ?',
          [req.params.id, breed]
        );

        if (existing.length > 0) {
          await db.execute(
            'UPDATE service_prices SET price = ? WHERE service_id = ? AND breed = ?',
            [price, req.params.id, breed]
          );
          const [updated] = await db.execute(
            'SELECT * FROM service_prices WHERE service_id = ? AND breed = ?',
            [req.params.id, breed]
          );
          res.json({ price: updated[0] });
        } else {
          const [uuidResult] = await db.execute('SELECT UUID() as id');
          const priceId = uuidResult[0].id;
          await db.execute(
            'INSERT INTO service_prices (id, service_id, breed, price) VALUES (?, ?, ?, ?)',
            [priceId, req.params.id, breed, price]
          );
          const [prices] = await db.execute('SELECT * FROM service_prices WHERE id = ?', [priceId]);
          res.status(201).json({ price: prices[0] });
        }
      } else {
        // Fallback: use size_category (for migration period)
        // Map breed to a size category temporarily
        const sizeMap = { 'small': 'small', 'medium': 'medium', 'large': 'large', 'xl': 'xl' };
        const sizeCategory = sizeMap[breed.toLowerCase()] || 'medium';
        
        const [existing] = await db.execute(
          'SELECT * FROM service_prices WHERE service_id = ? AND size_category = ?',
          [req.params.id, sizeCategory]
        );

        if (existing.length > 0) {
          await db.execute(
            'UPDATE service_prices SET price = ? WHERE service_id = ? AND size_category = ?',
            [price, req.params.id, sizeCategory]
          );
          const [updated] = await db.execute(
            'SELECT * FROM service_prices WHERE service_id = ? AND size_category = ?',
            [req.params.id, sizeCategory]
          );
          res.json({ price: { ...updated[0], breed } });
        } else {
          const [uuidResult] = await db.execute('SELECT UUID() as id');
          const priceId = uuidResult[0].id;
          await db.execute(
            'INSERT INTO service_prices (id, service_id, size_category, price) VALUES (?, ?, ?, ?)',
            [priceId, req.params.id, sizeCategory, price]
          );
          const [prices] = await db.execute('SELECT * FROM service_prices WHERE id = ?', [priceId]);
          res.status(201).json({ price: { ...prices[0], breed } });
        }
      }
    } catch (error) {
      console.error('Add price error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete service price
  router.delete('/:id/prices/:priceId', async (req, res) => {
    try {
      await db.execute(
        'DELETE FROM service_prices WHERE id = ? AND service_id = ?',
        [req.params.priceId, req.params.id]
      );
      res.json({ message: 'Price deleted' });
    } catch (error) {
      console.error('Delete price error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete all prices for a service
  router.delete('/:id/prices', async (req, res) => {
    try {
      await db.execute('DELETE FROM service_prices WHERE service_id = ?', [req.params.id]);
      res.json({ message: 'All prices deleted' });
    } catch (error) {
      console.error('Delete prices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

