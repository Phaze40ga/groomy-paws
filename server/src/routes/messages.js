import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

export default function messageRoutes(db, deps = {}) {
  const automationService = deps.automationService;
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);

  // Get all conversations for the current user
  router.get('/conversations', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

      let query, params;

      if (isAdminOrStaff) {
        // Staff/admin can see all conversations
        query = `
          SELECT 
            c.*,
            u.name as customer_name,
            u.email as customer_email,
            u.profile_picture_url as customer_profile_picture_url,
            u.is_online,
            u.last_seen_at,
            0 as unread_count,
            (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id
          FROM conversations c
          JOIN users u ON c.customer_id = u.id
          ORDER BY c.last_message_at DESC
        `;
        params = [];
      } else {
        // Customers can only see their own conversations
        // For customers, we want to show admin/staff info (who they're talking to)
        query = `
          SELECT 
            c.*,
            u.name as customer_name,
            u.email as customer_email,
            u.profile_picture_url as customer_profile_picture_url,
            0 as unread_count,
            (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id,
            COALESCE(
              (SELECT u2.name FROM messages m 
               JOIN users u2 ON m.sender_id = u2.id 
               WHERE m.conversation_id = c.id 
               AND (u2.role = 'admin' OR u2.role = 'staff')
               ORDER BY m.created_at DESC LIMIT 1),
              'Groomy Paws Staff'
            ) as staff_name,
            COALESCE(
              (SELECT u2.profile_picture_url FROM messages m 
               JOIN users u2 ON m.sender_id = u2.id 
               WHERE m.conversation_id = c.id 
               AND (u2.role = 'admin' OR u2.role = 'staff')
               ORDER BY m.created_at DESC LIMIT 1),
              NULL
            ) as staff_profile_picture_url
          FROM conversations c
          JOIN users u ON c.customer_id = u.id
          WHERE c.customer_id = ?
          ORDER BY c.last_message_at DESC
        `;
        params = [req.user.id];
      }

      const [conversations] = await db.execute(query, params);

      res.json({ conversations });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get or create a conversation
  router.post('/conversations', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';
      const { customer_id } = req.body;

      // If admin/staff, they can create conversations with customers
      // If customer, they create their own conversation
      const conversationCustomerId = isAdminOrStaff && customer_id ? customer_id : req.user.id;

      // Check if conversation already exists
      const [existing] = await db.execute(
        'SELECT * FROM conversations WHERE customer_id = ?',
        [conversationCustomerId]
      );

      if (existing.length > 0) {
        return res.json({ conversation: existing[0] });
      }

      // Create new conversation
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const conversationId = String(uuidResult[0].id).trim();

      await db.execute(
        'INSERT INTO conversations (id, customer_id) VALUES (?, ?)',
        [conversationId, conversationCustomerId]
      );

      const [conversations] = await db.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      );

      res.status(201).json({ conversation: conversations[0] });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get messages in a conversation
  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const { id } = req.params;
      const conversationId = String(id).trim();
      const limitParam = req.query.limit ? parseInt(req.query.limit) : 50;
      const before = req.query.before;

      // Validate limit
      const limit = isNaN(limitParam) || limitParam <= 0 ? 50 : Math.min(limitParam, 100);

      // Check if user has access to this conversation
      const [conversations] = await db.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      );

      if (conversations.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = conversations[0];
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

      // Check permissions - ensure string comparison
      const conversationCustomerId = String(conversation.customer_id || '').trim();
      const userId = String(req.user.id || '').trim();
      
      if (!isAdminOrStaff && conversationCustomerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get messages - MySQL requires LIMIT to be a number, not a parameter
      let query = `
        SELECT 
          m.*,
          u.name as sender_name,
          u.email as sender_email,
          u.role as sender_role,
          u.profile_picture_url as sender_profile_picture_url
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
      `;
      const params = [conversationId];

      if (before) {
        query += ' AND m.created_at < ?';
        params.push(before);
      }

      query += ` ORDER BY m.created_at DESC LIMIT ${limit}`;

      const [messages] = await db.execute(query, params);

      // Reverse to get chronological order
      messages.reverse();

      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Send a message
  router.post('/conversations/:id/messages', async (req, res) => {
    try {
      const { id } = req.params;
      const conversationId = String(id).trim();
      const { body } = req.body;

      if (!body || body.trim().length === 0) {
        return res.status(400).json({ error: 'Message body is required' });
      }

      // Check if conversation exists and user has access
      const [conversations] = await db.execute(
        'SELECT * FROM conversations WHERE id = ?',
        [conversationId]
      );

      if (conversations.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conversation = conversations[0];
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

      // Check permissions - ensure string comparison
      const conversationCustomerId = String(conversation.customer_id || '').trim();
      const userId = String(req.user.id || '').trim();
      
      if (!isAdminOrStaff && conversationCustomerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create message
      const [uuidResult] = await db.execute('SELECT UUID() as id');
      const messageId = String(uuidResult[0].id).trim();

      await db.execute(
        'INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)',
        [messageId, conversationId, String(req.user.id).trim(), body.trim()]
      );

      // Update conversation's last_message_at
      await db.execute(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
        [conversationId]
      );

      // Get the created message with sender info
      const [messages] = await db.execute(`
        SELECT 
          m.*,
          u.name as sender_name,
          u.email as sender_email,
          u.role as sender_role,
          u.profile_picture_url as sender_profile_picture_url
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [String(messageId).trim()]);

      const createdMessage = messages[0];
      res.status(201).json({ message: createdMessage });

      automationService
        ?.enqueueTrigger('chat_message', {
          conversation_id: conversationId,
          sender_id: req.user.id,
          sender_role: req.user.role,
        })
        .catch((error) => console.error('Automation trigger error', error));

      if (isAdminOrStaff) {
        automationService
          ?.closeIncidentsForEntity('chat.unanswered', conversationId)
          .catch((error) => console.error('Close SLA incident error', error));
      }
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Mark messages as read (optional - for unread count)
  router.put('/conversations/:id/read', async (req, res) => {
    try {
      const { id } = req.params;

      // This is a placeholder - you could add a read_status table
      // For now, we'll just return success
      res.json({ message: 'Marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get unread message count
  router.get('/unread-count', async (req, res) => {
    try {
      const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';

      let query;
      if (isAdminOrStaff) {
        // Staff/admin see unread messages from customers
        query = `
          SELECT COUNT(*) as count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE m.sender_id != ? 
          AND c.customer_id != ?
        `;
      } else {
        // Customers see unread messages from staff/admin
        query = `
          SELECT COUNT(*) as count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON m.sender_id = u.id
          WHERE c.customer_id = ?
          AND m.sender_id != ?
          AND u.role IN ('admin', 'staff')
        `;
      }

      const [result] = await db.execute(query, [req.user.id, req.user.id]);
      res.json({ unread_count: result[0].count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

