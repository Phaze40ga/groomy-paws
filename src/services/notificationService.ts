// Browser Notification Service
// Handles push notifications for appointment status changes

class NotificationService {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'default') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  async sendNotification(title: string, options: NotificationOptions = {}) {
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not already granted
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    // Show notification
    const notification = new Notification(title, {
      icon: '/favicon.ico', // You can add a custom icon
      badge: '/favicon.ico',
      tag: options.tag || 'groomy-paws',
      requireInteraction: options.requireInteraction || false,
      ...options,
    });

    // Auto-close after 5 seconds if not requiring interaction
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    // Handle click to focus window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  async notifyAppointmentStatusChange(
    petName: string,
    status: string,
    appointmentDate?: string
  ) {
    const statusMessages: Record<string, string> = {
      confirmed: `Your appointment for ${petName} has been confirmed!`,
      in_progress: `${petName}'s grooming session has started!`,
      completed: `🎉 ${petName}'s grooming is complete and ready for pickup!`,
      cancelled: `Your appointment for ${petName} has been cancelled.`,
    };

    const message = statusMessages[status] || `Your appointment for ${petName} status has been updated to ${status}`;
    
    const title = status === 'completed' 
      ? '🎉 Grooming Complete!'
      : 'Appointment Update';

    return this.sendNotification(title, {
      body: message,
      tag: `appointment-${status}`,
      requireInteraction: status === 'completed', // Make completed notifications more prominent
      data: {
        type: 'appointment',
        status,
        petName,
        appointmentDate,
      },
    });
  }

  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }
}

export const notificationService = new NotificationService();

