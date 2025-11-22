import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

export default function cardRoutes(db) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get user's saved cards
  router.get('/', async (req, res) => {
    try {
      const [cards] = await db.execute(
        'SELECT * FROM saved_cards WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
        [req.user.id]
      );
      res.json({ cards });
    } catch (error) {
      console.error('Get cards error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Add a saved card
  router.post('/', async (req, res) => {
    try {
      const {
        card_last4,
        card_brand,
        card_exp_month,
        card_exp_year,
        stripe_payment_method_id,
        is_default = false,
      } = req.body;

      if (!card_last4 || !card_brand || !card_exp_month || !card_exp_year || !stripe_payment_method_id) {
        return res.status(400).json({ error: 'All card fields are required' });
      }

      // If this is set as default, unset other default cards
      if (is_default) {
        await db.execute(
          'UPDATE saved_cards SET is_default = FALSE WHERE user_id = ?',
          [req.user.id]
        );
      }

      // Generate UUID for card
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const cardId = String(uuidResult[0].id).trim();

      await db.execute(
        'INSERT INTO saved_cards (id, user_id, card_last4, card_brand, card_exp_month, card_exp_year, stripe_payment_method_id, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          cardId,
          req.user.id,
          card_last4,
          card_brand,
          card_exp_month,
          card_exp_year,
          stripe_payment_method_id,
          is_default,
        ]
      );

      const [cards] = await db.execute('SELECT * FROM saved_cards WHERE id = ?', [cardId]);
      res.status(201).json({ card: cards[0] });
    } catch (error) {
      console.error('Add card error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update card (mainly for setting default)
  router.put('/:id', async (req, res) => {
    try {
      const { is_default } = req.body;

      // Check if card belongs to user
      const [cards] = await db.execute('SELECT * FROM saved_cards WHERE id = ? AND user_id = ?', [
        req.params.id,
        req.user.id,
      ]);

      if (cards.length === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }

      // If setting as default, unset other defaults
      if (is_default) {
        await db.execute('UPDATE saved_cards SET is_default = FALSE WHERE user_id = ?', [
          req.user.id,
        ]);
      }

      await db.execute('UPDATE saved_cards SET is_default = ? WHERE id = ?', [
        is_default,
        req.params.id,
      ]);

      const [updatedCards] = await db.execute('SELECT * FROM saved_cards WHERE id = ?', [
        req.params.id,
      ]);
      res.json({ card: updatedCards[0] });
    } catch (error) {
      console.error('Update card error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a saved card
  router.delete('/:id', async (req, res) => {
    try {
      // Check if card belongs to user
      const [cards] = await db.execute('SELECT * FROM saved_cards WHERE id = ? AND user_id = ?', [
        req.params.id,
        req.user.id,
      ]);

      if (cards.length === 0) {
        return res.status(404).json({ error: 'Card not found' });
      }

      await db.execute('DELETE FROM saved_cards WHERE id = ?', [req.params.id]);
      res.json({ message: 'Card deleted successfully' });
    } catch (error) {
      console.error('Delete card error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

