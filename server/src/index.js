import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import petRoutes from './routes/pets.js';
import serviceRoutes from './routes/services.js';
import appointmentRoutes from './routes/appointments.js';
import customerRoutes from './routes/customers.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/payments.js';
import cardRoutes from './routes/cards.js';
import uploadRoutes from './routes/upload.js';
import availabilityRoutes from './routes/availability.js';
import automationRoutes from './routes/automation.js';
import notificationsRoutes from './routes/notifications.js';
import { NotificationDispatcher } from './services/notificationDispatcher.js';
import { AutomationService } from './services/automationService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
// Use absolute path to ensure correct directory
const uploadsDir = path.join(__dirname, '../uploads');
console.log('Serving static files from:', uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Initialize database connection
const db = await createConnection();
const notificationDispatcher = new NotificationDispatcher(db);
const automationService = new AutomationService(db, notificationDispatcher);

// Routes
app.use('/api/auth', authRoutes(db));
app.use('/api/users', userRoutes(db));
app.use('/api/pets', petRoutes(db));
app.use('/api/services', serviceRoutes(db));
app.use('/api/appointments', appointmentRoutes(db, { automationService }));
app.use('/api/customers', customerRoutes(db));
app.use('/api/messages', messageRoutes(db, { automationService }));
app.use('/api/payments', paymentRoutes(db));
app.use('/api/cards', cardRoutes(db));
app.use('/api/upload', uploadRoutes(db));
app.use('/api/availability', availabilityRoutes(db));
app.use('/api/automation', automationRoutes(db, automationService));
app.use('/api/notifications', notificationsRoutes(db, notificationDispatcher));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

