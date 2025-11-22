import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { notificationService } from '../../services/notificationService';
import { Calendar, Clock } from 'lucide-react';

type AppointmentWithDetails = {
  id: string;
  scheduled_at: string;
  status: string;
  total_price: number;
  duration_minutes: number;
  pet_name?: string;
  pet: { name: string; breed?: string };
  services: { name: string }[];
};

export function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const previousAppointmentsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    loadAppointments();
  }, [user, filter]);

  // Poll for appointment status changes
  useEffect(() => {
    if (!user) return;

    async function checkStatusChanges() {
      try {
        const { appointments: allAppointments } = await api.getAppointments();
        
        // Check for status changes
        allAppointments.forEach((apt: any) => {
          const previousStatus = previousAppointmentsRef.current.get(apt.id);
          
          if (previousStatus && previousStatus !== apt.status) {
            // Status changed - send notification
            const petName = apt.pet_name || 'Your pet';
            
            // Only notify for important status changes
            if (['confirmed', 'in_progress', 'completed', 'cancelled'].includes(apt.status)) {
              notificationService.notifyAppointmentStatusChange(
                petName,
                apt.status,
                apt.scheduled_at
              ).catch(console.error);
            }
          }
          
          // Update previous status
          previousAppointmentsRef.current.set(apt.id, apt.status);
        });
      } catch (error) {
        console.error('Error checking appointment status:', error);
      }
    }

    // Initial check after loading appointments
    if (appointments.length > 0) {
      // Store initial statuses
      appointments.forEach((apt) => {
        previousAppointmentsRef.current.set(apt.id, apt.status);
      });
      
      // Check for changes every 10 seconds
      const interval = setInterval(checkStatusChanges, 10000);
      return () => clearInterval(interval);
    }
  }, [user, appointments]);

  async function loadAppointments() {
    if (!user) return;

    try {
      const { appointments: allAppointments } = await api.getAppointments();
      
      let filtered = allAppointments;
      if (filter === 'upcoming') {
        filtered = allAppointments.filter(apt => new Date(apt.scheduled_at) >= new Date());
      } else if (filter === 'past') {
        filtered = allAppointments.filter(apt => new Date(apt.scheduled_at) < new Date());
      }

      // Sort by scheduled_at descending
      filtered.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

      // Map to include pet name and services from the API response
      const appointmentsWithDetails = filtered.map((apt: any) => ({
        ...apt,
        pet: apt.pet_name ? { name: apt.pet_name, breed: apt.pet_breed } : { name: 'Unknown Pet' },
        services: apt.services || [],
      }));

      setAppointments(appointmentsWithDetails);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Appointments</h1>
          <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300 mt-1">View and manage your grooming appointments</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Past
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Appointments Found</h2>
            <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">
              {filter === 'upcoming'
                ? 'You have no upcoming appointments'
                : filter === 'past'
                ? 'You have no past appointments'
                : 'You have no appointments yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {appointment.pet.name}
                      {appointment.pet.breed && (
                        <span className="text-gray-600 dark:text-gray-300 font-normal ml-2">
                          ({appointment.pet.breed})
                        </span>
                      )}
                    </h3>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      ${Number(appointment.total_price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(appointment.scheduled_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(appointment.scheduled_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      ({appointment.duration_minutes} min)
                    </span>
                  </div>
                </div>

                {/* Services Section */}
                {appointment.services && appointment.services.length > 0 ? (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">Services:</h4>
                    <div className="flex flex-wrap gap-2">
                      {appointment.services.map((service: { name: string }, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-400 italic">No services listed</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
