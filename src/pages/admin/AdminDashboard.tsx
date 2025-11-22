import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useNotifications } from '../../components/NotificationProvider';
import { api, AutomationMetrics, WorkflowRun, SlaIncident } from '../../lib/api';
import {
  Calendar,
  Users,
  TrendingUp,
  MessageSquare,
  Bell,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';

export function AdminDashboard() {
  const { unreadCount } = useNotifications();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingWeek: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [automationMetrics, setAutomationMetrics] = useState<AutomationMetrics>({
    pending_over_24h: 0,
    in_progress_overrun: 0,
    chats_awaiting_reply: 0,
  });
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [slaIncidents, setSlaIncidents] = useState<SlaIncident[]>([]);
  const [automationLoading, setAutomationLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadAutomationData();
  }, []);

  async function loadDashboardData() {
    try {
      const [appointmentsRes, customersRes] = await Promise.all([
        api.getAppointments(),
        api.getCustomers(),
      ]);

      const appointments = appointmentsRes.appointments;
      const customers = customersRes.customers;
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayAppointments = appointments.filter(
        apt => new Date(apt.scheduled_at) >= todayStart && new Date(apt.scheduled_at) <= todayEnd
      ).length;

      const upcomingWeek = appointments.filter(
        apt => new Date(apt.scheduled_at) >= new Date() && new Date(apt.scheduled_at) <= weekFromNow
      ).length;

      // Calculate monthly revenue from appointments (simplified - would need payments table)
      const monthlyRevenue = appointments
        .filter(apt => new Date(apt.created_at) >= monthStart)
        .reduce((sum, apt) => sum + Number(apt.total_price || 0), 0);

      // Get recent appointments
      const recent = appointments
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
        .slice(0, 5);

      setStats({
        todayAppointments,
        upcomingWeek,
        totalCustomers: customers.length,
        monthlyRevenue,
      });

      setRecentAppointments(recent);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAutomationData() {
    try {
      setAutomationLoading(true);
      const [metricsRes, incidentsRes] = await Promise.all([
        api.getAutomationMetrics(),
        api.getSlaIncidents(),
      ]);
      setAutomationMetrics(metricsRes.metrics);
      setRecentRuns(metricsRes.recentRuns || []);
      setSlaIncidents(incidentsRes.incidents?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading automation metrics:', error);
    } finally {
      setAutomationLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Overview of your grooming business</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.todayAppointments}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Today's Appointments</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.upcomingWeek}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Upcoming This Week</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCustomers}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Total Customers</p>
          </div>

          <Link
            to="/admin/messages"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600 transition-colors relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center relative">
                <MessageSquare className="w-5 h-5 text-pink-600" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-xs font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </div>
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
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              label: 'Pending > 24h',
              value: automationMetrics.pending_over_24h,
              icon: AlertTriangle,
              description: 'Awaiting confirmation past SLA',
              color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
            },
            {
              label: 'In-progress overruns',
              value: automationMetrics.in_progress_overrun,
              icon: Clock,
              description: 'Sessions exceeding duration',
              color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
            },
            {
              label: 'Chats awaiting reply',
              value: automationMetrics.chats_awaiting_reply,
              icon: Activity,
              description: 'Conversations with no staff response',
              color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {automationLoading ? '—' : card.value}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Appointments</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentAppointments.length === 0 ? (
              <div className="p-6 text-center text-gray-600 dark:text-gray-300">No appointments yet</div>
            ) : (
              recentAppointments.map((apt: any) => (
                <div key={apt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {apt.customer_name || 'Unknown Customer'} - {apt.pet_name || 'Unknown Pet'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(apt.scheduled_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                          apt.status === 'confirmed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : apt.status === 'pending'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {apt.status}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        ${Number(apt.total_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Workflow activity</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Latest automation runs
                </p>
              </div>
              <Link
                to="/admin/automation"
                className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                View automation
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentRuns.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {automationLoading ? 'Loading...' : 'No recent workflow runs'}
                </div>
              ) : (
                recentRuns.map((run) => (
                  <div key={run.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {run.workflow_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(run.queued_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : run.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">SLA incidents</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active and recently resolved breaches
                </p>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {slaIncidents.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  {automationLoading ? 'Loading...' : 'No SLA incidents'}
                </div>
              ) : (
                slaIncidents.map((incident) => (
                  <div key={incident.id} className="p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {incident.target_name || incident.entity_type}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                          incident.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : incident.status === 'acknowledged'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {incident.entity_type} • {incident.entity_id}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Opened {new Date(incident.opened_at).toLocaleString()}
                    </p>
                    {incident.resolved_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Resolved {new Date(incident.resolved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
