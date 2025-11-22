import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../components/NotificationProvider';
import { api, Appointment } from '../../lib/api';
import { Calendar, PawPrint, MessageSquare, Plus, Bell, Sparkles, ClipboardCheck } from 'lucide-react';

const LOYALTY_TIERS = [
  { name: 'Bronze', threshold: 0 },
  { name: 'Silver', threshold: 100 },
  { name: 'Gold', threshold: 200 },
  { name: 'Platinum', threshold: 400 },
] as const;

const PROGRESS_WIDTH_CLASSES = [
  'w-0',
  'w-1/12',
  'w-2/12',
  'w-3/12',
  'w-4/12',
  'w-5/12',
  'w-6/12',
  'w-7/12',
  'w-8/12',
  'w-9/12',
  'w-10/12',
  'w-11/12',
  'w-full',
] as const;

export function Dashboard() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [petCount, setPetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [completedAppointments, setCompletedAppointments] = useState(0);

  const loyaltyInfo = useMemo(() => {
    const currentTier =
      [...LOYALTY_TIERS].reverse().find((tier) => loyaltyPoints >= tier.threshold) || LOYALTY_TIERS[0];
    const nextTier = LOYALTY_TIERS.find((tier) => tier.threshold > loyaltyPoints);
    const progress = nextTier
      ? (loyaltyPoints - currentTier.threshold) / Math.max(nextTier.threshold - currentTier.threshold, 1)
      : 1;

    return {
      currentTier,
      nextTier,
      progress: Math.min(Math.max(progress, 0), 1),
    };
  }, [loyaltyPoints]);

  const tipItems = useMemo(() => {
    const tips = [] as Array<{
      title: string;
      description: string;
      action?: { label: string; to: string };
    }>;

    if (!nextAppointment) {
      tips.push({
        title: 'No upcoming visit scheduled',
        description: 'Secure a preferred time that works for you by booking ahead.',
        action: { label: 'Book now', to: '/book' },
      });
    }

    if (petCount === 0) {
      tips.push({
        title: 'Add your pet details',
        description: 'Keep vaccination notes, photos, and grooming preferences handy for faster check-ins.',
        action: { label: 'Add a pet', to: '/pets' },
      });
    }

    if (completedAppointments === 0) {
      tips.push({
        title: 'Build your loyalty streak',
        description: 'Complete appointments to earn points—every visit brings you closer to rewards.',
      });
    }

    if (unreadCount > 0) {
      tips.push({
        title: 'You have unread messages',
        description: 'Keep the conversation going so we can tailor the perfect service for your pet.',
        action: { label: 'Open messages', to: '/messages' },
      });
    }

    return tips;
  }, [nextAppointment, petCount, completedAppointments, unreadCount]);

  const loyaltyProgressPercent = Math.round(loyaltyInfo.progress * 100);
  const progressWidthClass = useMemo(() => {
    const steps = PROGRESS_WIDTH_CLASSES.length - 1;
    const position = Math.round((loyaltyProgressPercent / 100) * steps);
    return PROGRESS_WIDTH_CLASSES[Math.min(steps, Math.max(0, position))];
  }, [loyaltyProgressPercent]);
  const nextTierLabel = loyaltyInfo.nextTier?.name ?? 'VIP';
  const nextTierThreshold = loyaltyInfo.nextTier?.threshold ?? loyaltyPoints;

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      const [appointmentsRes, petsRes] = await Promise.all([
        api.getAppointments(),
        api.getPets()
      ]);

      // Find next upcoming appointment
      const upcoming = appointmentsRes.appointments
        .filter(apt => new Date(apt.scheduled_at) >= new Date())
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
      setNextAppointment(upcoming ?? null);

      const completed = appointmentsRes.appointments.filter((apt) => apt.status === 'completed');
      setCompletedAppointments(completed.length);
      setLoyaltyPoints(completed.length * 10);

      setPetCount(petsRes.pets?.length || 0);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your pets and grooming appointments</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-primary-600" />
              </div>
              <Link
                to="/pets"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Manage
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{petCount}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Registered Pets</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary-600" />
              </div>
              <Link
                to="/appointments"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View All
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {nextAppointment ? '1' : '0'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Upcoming Appointments</p>
          </div>

          <Link
            to="/messages"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600 transition-colors relative"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center relative">
                <MessageSquare className="w-6 h-6 text-primary-600" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Open
              </span>
            </div>
            <h3 className={`text-2xl font-bold ${unreadCount > 0 ? 'text-pink-600 dark:text-pink-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {unreadCount}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Unread Messages</p>
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2">
                <Bell className="w-5 h-5 text-pink-500 animate-pulse" />
              </div>
            )}
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200 md:col-span-2 xl:col-span-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loyalty tier</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {loyaltyInfo.currentTier.name}
                </h3>
              </div>
              <ClipboardCheck className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>{loyaltyPoints} pts</span>
                <span>
                  {nextTierLabel} at {nextTierThreshold} pts
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-primary-600 rounded-full transition-all duration-300 ${progressWidthClass}`}
                  aria-label={`Progress toward ${nextTierLabel}`}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Completed visits: {completedAppointments} · Each visit earns 10 points toward upgrades and perks.
            </p>
          </div>
        </div>

        {nextAppointment ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Next appointment</p>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {new Date(nextAppointment.scheduled_at).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(nextAppointment.scheduled_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      for {nextAppointment.pet_name || 'your pet'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextAppointment.services && nextAppointment.services.length > 0 ? (
                    nextAppointment.services.map((service, index) => (
                      <span
                        key={`${service.name}-${index}`}
                        className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200"
                      >
                        {service.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Services will appear here once confirmed.
                    </span>
                  )}
                </div>
                {nextAppointment.pet_grooming_notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Prep tip: {nextAppointment.pet_grooming_notes}
                  </p>
                )}
              </div>
              <div className="w-full md:w-64 flex flex-col gap-3">
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold capitalize bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  {nextAppointment.status.replace('_', ' ')}
                </span>
                <Link
                  to="/appointments"
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white text-center font-medium hover:bg-primary-700 transition-colors"
                >
                  Manage appointment
                </Link>
                <Link
                  to="/messages"
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-center font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Message the team
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg shadow-sm p-8 border border-blue-200 dark:border-blue-800 text-center transition-colors duration-200">
            <Calendar className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Upcoming Appointments</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Book a grooming session and pre-fill your intake so check-in is effortless.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Book appointment
              </Link>
              <Link
                to="/book"
                state={{ fromDashboard: true, intent: 'intake' }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors"
              >
                Pre-fill intake
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-4">
              <ClipboardCheck className="w-6 h-6 text-primary-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Quick actions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Shortcuts to keep profiles and intake details ready before your visit.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                to="/pets"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                Add pet profile
              </Link>
              <Link
                to="/book"
                state={{ fromDashboard: true, intent: 'intake' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors"
              >
                Pre-fill intake form
              </Link>
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Book a visit
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/pets"
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <PawPrint className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Manage your pets</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Update notes, photos, and care needs</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/book"
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm">Book appointment</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Lock in your preferred time</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {tipItems.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Personalized tips</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Suggestions based on your current activity.
                  </p>
                </div>
              </div>
              <ul className="space-y-4">
                {tipItems.map((tip) => (
                  <li key={tip.title} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{tip.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{tip.description}</p>
                      {tip.action && (
                        <Link
                          to={tip.action.to}
                          className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-300 text-sm font-medium mt-1"
                        >
                          {tip.action.label}
                          <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
