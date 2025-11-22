import nodemailer from 'nodemailer';

const DEFAULT_PREFS = {
  email_enabled: 1,
  sms_enabled: 0,
  push_enabled: 1,
};

export class NotificationDispatcher {
  constructor(db) {
    this.db = db;
    this.transporter = this.createTransport();
    this.smsWebhook = process.env.SMS_WEBHOOK_URL;
  }

  createTransport() {
    if (!process.env.SMTP_HOST) {
      return null;
    }
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    });
  }

  async getUserContact(userId) {
    const [rows] = await this.db.execute(
      'SELECT id, email, phone, name FROM users WHERE id = ?',
      [userId]
    );
    return rows[0];
  }

  async getPreferences(userId) {
    const [rows] = await this.db.execute(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return { user_id: userId, ...DEFAULT_PREFS };
    }
    return rows[0];
  }

  async updatePreferences(userId, updates) {
    const prefs = await this.getPreferences(userId);
    const next = {
      email_enabled:
        updates.email_enabled ?? prefs.email_enabled ?? DEFAULT_PREFS.email_enabled,
      sms_enabled:
        updates.sms_enabled ?? prefs.sms_enabled ?? DEFAULT_PREFS.sms_enabled,
      push_enabled:
        updates.push_enabled ?? prefs.push_enabled ?? DEFAULT_PREFS.push_enabled,
    };
    await this.db.execute(
      `
        INSERT INTO notification_preferences (user_id, email_enabled, sms_enabled, push_enabled)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          email_enabled = VALUES(email_enabled),
          sms_enabled = VALUES(sms_enabled),
          push_enabled = VALUES(push_enabled)
      `,
      [userId, next.email_enabled, next.sms_enabled, next.push_enabled]
    );
    return next;
  }

  async listNotifications(userId, options = {}) {
    const limitParam = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 100;
    const limit = Number.isFinite(limitParam) ? limitParam : 100;

    let query = `
      SELECT *
      FROM user_notifications
      WHERE user_id = ?
    `;
    const params = [userId];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const [rows] = await this.db.execute(query, params);
    return rows.map((row) => ({
      ...row,
      channel_sent: row.channel_sent ? JSON.parse(row.channel_sent) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));
  }

  async createNotification(userId, notification) {
    const title = notification.title || 'Notification';
    const category = notification.category || 'system';
    const channels = [];

    await this.db.execute(
      `
        INSERT INTO user_notifications
          (id, user_id, category, title, body, status, metadata)
        VALUES (UUID(), ?, ?, ?, ?, 'new', ?)
      `,
      [
        userId,
        category,
        title,
        notification.body,
        JSON.stringify(notification.metadata || {}),
      ]
    );

    const [rows] = await this.db.execute(
      'SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    await this.dispatchChannels({
      notification: rows[0],
      targetUserId: userId,
      channelsOverride: notification.channels,
    });

    return rows[0];
  }

  async sendNotification({ userId, title, body, category = 'system', metadata = {} }) {
    await this.createNotification(userId, {
      title,
      body,
      category,
      metadata,
    });
  }

  async dispatchChannels({ notification, targetUserId, channelsOverride }) {
    const prefs = await this.getPreferences(targetUserId);
    const contact = await this.getUserContact(targetUserId);
    const sentChannels = [];

    const shouldSendEmail =
      (channelsOverride ? channelsOverride.includes('email') : true) &&
      prefs.email_enabled &&
      this.transporter &&
      contact?.email;

    if (shouldSendEmail) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'no-reply@groomypaws.com',
          to: contact.email,
          subject: notification.title || 'Notification',
          text: notification.body,
        });
        sentChannels.push('email');
      } catch (error) {
        console.error('Email dispatch error', error);
      }
    }

    const shouldSendSms =
      (channelsOverride ? channelsOverride.includes('sms') : true) &&
      prefs.sms_enabled &&
      this.smsWebhook &&
      contact?.phone;

    if (shouldSendSms) {
      try {
        await fetch(this.smsWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: contact.phone,
            body: notification.body,
          }),
        });
        sentChannels.push('sms');
      } catch (error) {
        console.error('SMS dispatch error', error);
      }
    }

    if (
      (channelsOverride ? channelsOverride.includes('push') : true) &&
      prefs.push_enabled
    ) {
      sentChannels.push('push');
    }

    await this.db.execute(
      `
        UPDATE user_notifications
        SET channel_sent = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [JSON.stringify(sentChannels), notification.id]
    );
  }

  async updateNotificationStatus(userId, id, status, options = {}) {
    const params = [status, userId, id];
    let extraSet = '';

    if (status === 'snoozed' && options.snoozed_until) {
      extraSet = ', snoozed_until = ?';
      params.unshift(options.snoozed_until);
    } else if (status !== 'snoozed') {
      extraSet = ', snoozed_until = NULL';
    }

    const setClause = `status = ?${extraSet}`;
    await this.db.execute(
      `
        UPDATE user_notifications
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND id = ?
      `,
      params
    );
  }
}

