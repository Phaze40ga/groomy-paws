import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';

export default function petRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get user's pets
  router.get('/', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';
      let query, params;

      if (isAdminOrStaff) {
        query = 'SELECT * FROM pets';
        params = [];
      } else {
        query = 'SELECT * FROM pets WHERE owner_id = ?';
        params = [req.user.id];
      }

      const [pets] = await db.execute(query, params);
      res.json({ pets });
    } catch (error) {
      console.error('Get pets error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get single pet
  router.get('/:id', async (req, res) => {
    try {
      const [pets] = await db.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);

      if (pets.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const pet = pets[0];

      // Check permissions
      if (pet.owner_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ pet });
    } catch (error) {
      console.error('Get pet error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create pet
  router.post('/', async (req, res) => {
    try {
      const { name, breed, size_category, age, weight, temperament_notes, grooming_notes, photo_url } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Pet name is required' });
      }

      // Generate UUID for pet
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const petId = uuidResult[0].id;

      await db.execute(
        'INSERT INTO pets (id, owner_id, name, breed, size_category, age, weight, temperament_notes, grooming_notes, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [petId, req.user.id, name, breed || null, size_category || null, age || null, weight || null, temperament_notes || null, grooming_notes || null, photo_url || null]
      );

      const [pets] = await db.execute('SELECT * FROM pets WHERE id = ?', [petId]);
      res.status(201).json({ pet: pets[0] });
    } catch (error) {
      console.error('Create pet error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update pet
  router.put('/:id', async (req, res) => {
    try {
      const [pets] = await db.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);

      if (pets.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const pet = pets[0];

      // Check permissions
      if (pet.owner_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { name, breed, size_category, age, weight, temperament_notes, grooming_notes, photo_url } = req.body;

      // Ensure size_category is one of the valid values
      const validSizeCategories = ['small', 'medium', 'large', 'xl'];
      const finalSizeCategory = size_category && validSizeCategories.includes(size_category) ? size_category : null;

      await db.execute(
        'UPDATE pets SET name = ?, breed = ?, size_category = ?, age = ?, weight = ?, temperament_notes = ?, grooming_notes = ?, photo_url = ? WHERE id = ?',
        [name, breed || null, finalSizeCategory, age || null, weight || null, temperament_notes || null, grooming_notes || null, photo_url || null, req.params.id]
      );

      const [updated] = await db.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);
      res.json({ pet: updated[0] });
    } catch (error) {
      console.error('Update pet error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete pet
  router.delete('/:id', async (req, res) => {
    try {
      const [pets] = await db.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);

      if (pets.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const pet = pets[0];

      // Check permissions
      if (pet.owner_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await db.execute('DELETE FROM pets WHERE id = ?', [req.params.id]);
      res.json({ message: 'Pet deleted' });
    } catch (error) {
      console.error('Delete pet error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

