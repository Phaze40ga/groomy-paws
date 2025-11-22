import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { NotificationToast, Notification as ToastNotification } from './NotificationToast';
import { api, UserNotification, NotificationPreferences as ApiNotificationPreferences } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/notificationService';

type NotificationPreferences = {
  email: boolean;
  sms: boolean;
  push: boolean;
};

type NotificationContextType = {
  notifications: UserNotification[];
  addNotification: (
    notification: Omit<ToastNotification, 'id' | 'timestamp' | 'status'> & {
      status?: ToastNotification['status'];
      timestamp?: Date;
    }
  ) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  snoozeNotification: (id: string, minutes: number) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  unreadCount: number;
  inboxUnreadCount: number;
  refreshInbox: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultPreferences: NotificationPreferences = {
  email: true,
  sms: false,
  push: true,
};

function mapApiPreferences(
  prefs: ApiNotificationPreferences | undefined
): NotificationPreferences {
  if (!prefs) return defaultPreferences;
  return {
    email: !!prefs.email_enabled,
    sms: !!prefs.sms_enabled,
    push: !!prefs.push_enabled,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [inbox, setInbox] = useState<UserNotification[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const [lastMessageCheck, setLastMessageCheck] = useState<Date>(new Date());

  const inboxUnreadCount = useMemo(
    () => inbox.filter((notification) => notification.status === 'new').length,
    [inbox]
  );

  const refreshInbox = useCallback(async () => {
    if (!user) {
      setInbox([]);
      return;
    }
    try {
      const { notifications } = await api.getNotifications({ limit: 200 });
      setInbox(notifications);
      const existingIds = seenNotificationIds.current;
      notifications.forEach((notification) => {
        if (
          !existingIds.has(notification.id) &&
          notification.status === 'new'
        ) {
          setToastQueue((prev) => [
            {
              id: notification.id,
              message: notification.body,
              senderName: notification.metadata?.senderName as string | undefined,
              conversationId: notification.metadata?.conversationId as string | undefined,
              timestamp: new Date(notification.created_at),
              status: 'new',
              category: notification.category,
            },
            ...prev,
          ]);
        }
      });
      seenNotificationIds.current = new Set(notifications.map((n) => n.id));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(defaultPreferences);
      return;
    }
    try {
      const { preferences: apiPrefs } = await api.getNotificationPreferences();
      setPreferences(mapApiPreferences(apiPrefs));
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }, [user]);

  useEffect(() => {
    if (notificationService.isSupported()) {
      notificationService.requestPermission().catch(console.error);
    }
  }, []);

  useEffect(() => {
    refreshInbox();
    loadPreferences();
    if (!user) {
      return;
    }
    const interval = setInterval(refreshInbox, 30000);
    return () => clearInterval(interval);
  }, [refreshInbox, loadPreferences, user]);

  const addNotification = useCallback(
    async (
      notification: Omit<ToastNotification, 'id' | 'timestamp' | 'status'> & {
        status?: ToastNotification['status'];
        timestamp?: Date;
      }
    ) => {
      if (!user) return;
      try {
        await api.createNotification({
          title: notification.message,
          body: notification.message,
          category: notification.category ?? 'system',
          metadata: {
            senderName: notification.senderName,
            conversationId: notification.conversationId,
          },
        });
        setToastQueue((prev) => [
          {
            id: Date.now().toString(),
            ...notification,
            status: notification.status ?? 'new',
            timestamp: notification.timestamp ? new Date(notification.timestamp) : new Date(),
          },
          ...prev,
        ]);
        await refreshInbox();
      } catch (error) {
        console.error('Error creating notification', error);
      }
    },
    [refreshInbox, user]
  );

  const removeToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await api.markNotificationRead(id);
        removeToast(id);
        await refreshInbox();
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    },
    [refreshInbox, removeToast]
  );

  const snoozeNotification = useCallback(
    async (id: string, minutes: number) => {
      try {
        await api.snoozeNotification(id, minutes);
        removeToast(id);
        await refreshInbox();
      } catch (error) {
        console.error('Error snoozing notification:', error);
      }
    },
    [refreshInbox, removeToast]
  );

  const dismissNotification = useCallback(
    async (id: string) => {
      try {
        await api.dismissNotification(id);
        removeToast(id);
        await refreshInbox();
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    },
    [refreshInbox, removeToast]
  );

  const removeNotification = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user) return;
      try {
        const apiPrefs = await api.updateNotificationPreferences({
          email_enabled:
            updates.email ?? preferences.email ? 1 : 0,
          sms_enabled: updates.sms ?? preferences.sms ? 1 : 0,
          push_enabled:
            updates.push ?? preferences.push ? 1 : 0,
        });
        setPreferences(mapApiPreferences(apiPrefs.preferences));
      } catch (error) {
        console.error('Error updating notification preferences:', error);
      }
    },
    [preferences, user]
  );

  useEffect(() => {
    if (!user) return;

    async function loadUnreadCount() {
      try {
        const { unread_count } = await api.getUnreadCount();
        setUnreadCount(unread_count);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    }

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const previousLastMessageTimesRef = useRef<Map<string, Date>>(new Map());

  useEffect(() => {
    if (!user) {
      previousLastMessageTimesRef.current.clear();
      return;
    }

    async function checkForNewMessages() {
      try {
        const { conversations } = await api.getConversations();
        conversations.forEach((conv) => {
          const lastMessageAt = new Date(conv.last_message_at);
          const previousTime = previousLastMessageTimesRef.current.get(conv.id);
          const lastMessageSenderId = conv.last_message_sender_id;
          const isFromOtherUser =
            lastMessageSenderId &&
            String(lastMessageSenderId).trim() !== String(user.id).trim();

          if (
            isFromOtherUser &&
            (!previousTime || lastMessageAt > previousTime)
          ) {
            const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';
            const message = isAdminOrStaff
              ? 'You have a new message from a customer'
              : 'You have a new message';

            addNotification({
              message,
              senderName: isAdminOrStaff ? conv.customer_name || 'Customer' : 'the groomer',
              conversationId: conv.id,
              category: 'message',
            });
            setUnreadCount((prev) => prev + 1);
          }

          previousLastMessageTimesRef.current.set(conv.id, lastMessageAt);
        });
        setLastMessageCheck(new Date());
      } catch (error) {
        console.error('Error checking new messages:', error);
      }
    }

    const initialTimeout = setTimeout(checkForNewMessages, 2000);
    const interval = setInterval(checkForNewMessages, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: inbox,
        addNotification,
        removeNotification,
        markAsRead,
        snoozeNotification,
        dismissNotification,
        preferences,
        updatePreferences,
        unreadCount,
        inboxUnreadCount,
        refreshInbox,
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toastQueue.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={async (id) => {
              removeToast(id);
              await markAsRead(id);
            }}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

