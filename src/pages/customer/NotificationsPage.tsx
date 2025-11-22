import { useMemo, useState } from 'react';
import { Bell, Clock, Check, PauseCircle, Trash2, Inbox, Mail, Smartphone, Monitor } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useNotifications } from '../../components/NotificationProvider';

const SNOOZE_OPTIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 60 * 4 },
  { label: 'Tomorrow', minutes: 60 * 24 },
] as const;

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Snoozed', value: 'snoozed' },
  { label: 'Dismissed', value: 'dismissed' },
] as const;

const CHANNEL_META = {
  email: {
    icon: Mail,
    label: 'Email',
    description: 'Reminders sent to your inbox.',
  },
  sms: {
    icon: Smartphone,
    label: 'SMS',
    description: 'Texts to your mobile device.',
  },
  push: {
    icon: Monitor,
    label: 'Push',
    description: 'Browser/device push alerts.',
  },
} as const;

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationsPage() {
  const {
    notifications,
    markAsRead,
    snoozeNotification,
    dismissNotification,
    preferences,
    updatePreferences,
    inboxUnreadCount,
  } = useNotifications();

  const [activeFilter, setActiveFilter] =
    useState<(typeof FILTERS)[number]['value']>('all');

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return sortedNotifications;
    return sortedNotifications.filter((notification) => notification.status === activeFilter);
  }, [sortedNotifications, activeFilter]);

  const snoozedCount = notifications.filter((notification) => notification.status === 'snoozed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review reminders, messages, and tailor how you'd like to be contacted.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New notifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {inboxUnreadCount}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Snoozed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {snoozedCount}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total saved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {notifications.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p>{activeFilter === 'all' ? 'You’re all caught up!' : 'Nothing in this filter yet.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => {
                const metadata = (notification.metadata || {}) as Record<string, unknown>;
                const senderName = metadata.senderName as string | undefined;
                return (
                <li key={notification.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          notification.status === 'new'
                            ? 'bg-primary-100 text-primary-700'
                            : notification.status === 'snoozed'
                            ? 'bg-amber-100 text-amber-700'
                            : notification.status === 'dismissed'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {notification.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatRelative(new Date(notification.created_at))}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {notification.title || notification.body}
                    </p>
                    {senderName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From {senderName}
                      </p>
                    )}
                    {notification.snoozed_until && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Snoozed until {new Date(notification.snoozed_until).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notification.status !== 'dismissed' && notification.status !== 'read' && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        Mark read
                      </button>
                    )}
                    {notification.status !== 'dismissed' && (
                      <div className="relative">
                        <details className="group">
                          <summary className="list-none px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer flex items-center gap-1">
                            <PauseCircle className="w-3 h-3" />
                            Snooze
                          </summary>
                          <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            {SNOOZE_OPTIONS.map((option) => (
                              <button
                                key={option.label}
                                onClick={() => snoozeNotification(notification.id, option.minutes)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Dismiss
                    </button>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Channel preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Choose how you’d like to receive reminders and important updates.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((channelKey) => {
              const channel = CHANNEL_META[channelKey];
              const enabled = preferences[channelKey];
              const Icon = channel.icon;

              return (
                <label
                  key={channelKey}
                  className={`border rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-colors ${
                    enabled
                      ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{channel.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{channel.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => updatePreferences({ [channelKey]: !enabled })}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

