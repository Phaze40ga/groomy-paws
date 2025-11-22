import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { Clock, Settings, ChevronLeft, ChevronRight, X, StickyNote, CalendarDays, MessageCircle } from 'lucide-react';

type Appointment = {
  id: string;
  customer_id: string;
  scheduled_at: string;
  customer_name?: string;
  customer_email?: string;
  pet_name?: string;
  pet_breed?: string;
  pet_size_category?: string;
  status: string;
  duration_minutes: number;
  total_price: number;
  internal_notes?: string;
  pet_grooming_notes?: string;
  pet_temperament_notes?: string;
  services?: { name: string }[];
};

type AvailabilitySlot = {
  id?: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
};

export function AdminCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newSlot, setNewSlot] = useState({ start_time: '09:00', end_time: '17:00', is_available: true });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<string | null>(null);
  const [agendaDate, setAgendaDate] = useState<Date>(new Date());
  const [internalNotesDraft, setInternalNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  useEffect(() => {
    if (selectedAppointment) {
      setInternalNotesDraft(selectedAppointment.internal_notes || '');
      const scheduledDate = new Date(selectedAppointment.scheduled_at);
      setRescheduleDate(formatDateInputValue(scheduledDate));
      setRescheduleTime(formatTimeInputValue(scheduledDate));
    } else {
      setInternalNotesDraft('');
      setRescheduleDate('');
      setRescheduleTime('');
    }
  }, [selectedAppointment]);

  async function loadData() {
    try {
      setLoading(true);
      const { appointments: allAppointments } = await api.getAppointments();
      
      // Filter appointments for current month
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthAppointments = allAppointments.filter((apt: Appointment) => {
        const aptDate = new Date(apt.scheduled_at);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });

      setAppointments(monthAppointments);
      
      // Load availability (placeholder - will implement backend)
      loadAvailability();
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailability() {
    try {
      const { availability: availabilityData } = await api.getAvailability();
      setAvailability(availabilityData || []);
    } catch (error) {
      console.error('Error loading availability:', error);
      // Set default availability if none exists
      const defaultAvailability: AvailabilitySlot[] = [];
      for (let i = 1; i <= 5; i++) { // Monday to Friday
        defaultAvailability.push({
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
        });
      }
      setAvailability(defaultAvailability);
    }
  }

  function getDaysInMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }

  function getAppointmentsForDay(day: number) {
    if (!day) return [];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_at);
      return aptDate.getDate() === day && 
             aptDate.getMonth() === currentDate.getMonth() &&
             aptDate.getFullYear() === currentDate.getFullYear();
    });
  }

  function getAvailabilityForDay(dayOfWeek: number) {
    return availability.find(slot => slot.day_of_week === dayOfWeek);
  }

  function navigateMonth(direction: 'prev' | 'next') {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  async function saveAvailability() {
    if (selectedDay === null) return;

    try {
      await api.setAvailability(
        selectedDay,
        newSlot.start_time,
        newSlot.end_time,
        newSlot.is_available
      );
      
      // Reload availability to get updated data
      await loadAvailability();
      setShowAvailabilityModal(false);
      setSelectedDay(null);
      alert('Availability saved successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability');
    }
  }

  function mergeUpdatedAppointment(updatedAppointment: Appointment) {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === updatedAppointment.id ? updatedAppointment : apt))
    );
    setSelectedAppointment((prev) =>
      prev && prev.id === updatedAppointment.id ? updatedAppointment : prev
    );
  }

  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    try {
      setUpdatingStatus(newStatus);
      const { appointment } = await api.updateAppointment(appointmentId, { status: newStatus });
      mergeUpdatedAppointment(appointment);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Failed to update appointment');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function saveInternalNotes() {
    if (!selectedAppointment) return;
    try {
      setSavingNotes(true);
      const { appointment } = await api.updateAppointment(selectedAppointment.id, {
        internal_notes: internalNotesDraft,
      });
      mergeUpdatedAppointment(appointment);
    } catch (error) {
      console.error('Error saving internal notes:', error);
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  async function rescheduleAppointmentTime(appointmentId: string, isoDate: string) {
    try {
      setReschedulingAppointmentId(appointmentId);
      const { appointment } = await api.updateAppointment(appointmentId, { scheduled_at: isoDate });
      mergeUpdatedAppointment(appointment);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Failed to reschedule appointment');
    } finally {
      setReschedulingAppointmentId(null);
    }
  }

  async function handleModalReschedule() {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;
    const isoDate = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    await rescheduleAppointmentTime(selectedAppointment.id, isoDate);
  }

  async function handleDayDrop(day: number) {
    if (!draggedAppointment || !day) return;
    const appointment = draggedAppointment;
    const originalDate = new Date(appointment.scheduled_at);
    const targetDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
      originalDate.getHours(),
      originalDate.getMinutes()
    );

    try {
      await rescheduleAppointmentTime(appointment.id, targetDate.toISOString());
      setAgendaDate(targetDate);
    } finally {
      setDraggedAppointment(null);
    }
  }

  function formatTime(time: string) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function formatDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTimeInputValue(date: Date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function isSameDay(dateA: Date, dateB: Date) {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const agendaAppointments = appointments
    .filter((apt) => isSameDay(new Date(apt.scheduled_at), agendaDate))
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  const agendaInputValue = formatDateInputValue(agendaDate);
  const agendaDisplay = agendaDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const internalNoteTags = internalNotesDraft.match(/#[\w-]+/g) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar & Availability</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">View appointments and manage your availability</p>
          </div>
          <button
            onClick={() => {
              setSelectedDay(null);
              setNewSlot({ start_time: '09:00', end_time: '17:00', is_available: true });
              setShowAvailabilityModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Set Availability
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{monthName}</h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                aria-label="Go to today"
                title="Go to today"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 dark:text-gray-300 py-2 text-xs sm:text-sm">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}

            {/* Calendar Days */}
            {days.map((day, index) => {
              const dayAppointments = day ? getAppointmentsForDay(day) : [];
              const dayOfWeek = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() : null;
              const dayAvailability = dayOfWeek !== null ? getAvailabilityForDay(dayOfWeek) : null;
              const isToday = day && 
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();
              const isDragTarget = Boolean(draggedAppointment && day);
              const cellBaseDate = day
                ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                : null;

              return (
                <div
                  key={index}
                  className={`min-h-[80px] sm:min-h-[100px] border border-gray-200 dark:border-gray-600 rounded-lg p-1 sm:p-2 ${
                    !day
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : isToday
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600'
                      : 'bg-white dark:bg-gray-800'
                  } ${isDragTarget ? 'ring-1 ring-primary-400 dark:ring-primary-500 bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                  onDragOver={(e) => {
                    if (draggedAppointment && day) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    if (day) {
                      e.preventDefault();
                      handleDayDrop(day);
                    }
                  }}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <button
                          type="button"
                          onClick={() =>
                            setAgendaDate(
                              new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth(),
                                day
                              )
                            )
                          }
                          className={`text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            isToday
                              ? 'text-primary-700 dark:text-primary-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                          title="Jump to day agenda"
                        >
                          {day}
                        </button>
                        {dayAvailability && (
                          <span className="text-xs text-green-600 dark:text-green-400" title={`Available ${formatTime(dayAvailability.start_time)} - ${formatTime(dayAvailability.end_time)}`}>
                            <Clock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {dayAppointments.slice(0, 2).map(apt => (
                          <div
                            key={apt.id}
                            draggable
                            onClick={() => setSelectedAppointment(apt)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedAppointment(apt);
                              }
                            }}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', apt.id);
                              setDraggedAppointment(apt);
                            }}
                            onDragEnd={() => setDraggedAppointment(null)}
                            className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center gap-1 ${
                              apt.status === 'confirmed'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                                : apt.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : apt.status === 'cancelled'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                            }`}
                            title={`${apt.pet_name || 'Pet'} - ${new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="hidden sm:inline">
                                {new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} {apt.pet_name || 'Pet'}
                              </span>
                              <span className="sm:hidden">
                                {new Date(apt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            {apt.internal_notes && (
                              <StickyNote
                                className="w-3 h-3 text-amber-500 shrink-0"
                                aria-label="Has internal notes"
                              />
                            )}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (cellBaseDate) {
                                setAgendaDate(cellBaseDate);
                              }
                            }}
                            className="w-full text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            +{dayAppointments.length - 2} more
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Available</span>
            </div>
          </div>
        </div>

        {/* Day Agenda */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Day Agenda</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Jump to a day to review every appointment in detail.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-700 dark:text-primary-200">
                <CalendarDays className="w-4 h-4" />
                <span className="text-sm font-medium">{agendaDisplay}</span>
              </div>
              <input
                type="date"
                value={agendaInputValue}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  setAgendaDate(new Date(year, (month || 1) - 1, day || 1));
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                aria-label="Select agenda date"
              />
              <button
                onClick={() => setAgendaDate(new Date())}
                className="px-3 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {agendaAppointments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No appointments scheduled for this day.
            </p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {agendaAppointments.map((apt) => (
                <div key={apt.id} className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="sm:w-32 font-mono text-sm text-gray-700 dark:text-gray-300">
                    {new Date(apt.scheduled_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {apt.pet_name || 'Pet'} • {apt.customer_name || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {apt.services && apt.services.length > 0
                            ? apt.services.map((service) => service.name).join(', ')
                            : 'No services recorded'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          apt.status === 'confirmed'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : apt.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : apt.status === 'cancelled'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        }`}
                      >
                        {apt.status.replace('_', ' ')}
                      </span>
                    </div>
                    {(apt.internal_notes || apt.pet_grooming_notes || apt.pet_temperament_notes) && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        {apt.internal_notes && (
                          <p>
                            <span className="font-semibold">Notes: </span>
                            {apt.internal_notes}
                          </p>
                        )}
                        {apt.pet_grooming_notes && (
                          <p>
                            <span className="font-semibold">Grooming: </span>
                            {apt.pet_grooming_notes}
                          </p>
                        )}
                        {apt.pet_temperament_notes && (
                          <p>
                            <span className="font-semibold">Temperament: </span>
                            {apt.pet_temperament_notes}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedAppointment(apt)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      >
                        Open Details
                      </button>
                      <button
                        onClick={() => navigate(`/admin/messages?customerId=${apt.customer_id}`)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Message Customer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Set Availability
              </h2>
              <button
                onClick={() => {
                  setShowAvailabilityModal(false);
                  setSelectedDay(null);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                aria-label="Close modal"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={selectedDay !== null ? selectedDay : ''}
                  onChange={(e) => {
                    const day = parseInt(e.target.value);
                    setSelectedDay(day);
                    const existing = availability.find(slot => slot.day_of_week === day);
                    if (existing) {
                      setNewSlot({
                        start_time: existing.start_time,
                        end_time: existing.end_time,
                        is_available: existing.is_available,
                      });
                    } else {
                      setNewSlot({ start_time: '09:00', end_time: '17:00', is_available: true });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Select day of week"
                  title="Select day of week"
                >
                  <option value="">Select a day</option>
                  {daysOfWeek.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Start time"
                  title="Start time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="End time"
                  title="End time"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={newSlot.is_available}
                  onChange={(e) => setNewSlot({ ...newSlot, is_available: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_available" className="text-sm text-gray-700 dark:text-gray-300">
                  Available on this day
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAvailabilityModal(false);
                  setSelectedDay(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAvailability}
                disabled={selectedDay === null}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Appointment</p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedAppointment.pet_name || 'Pet'} •{' '}
                  {new Date(selectedAppointment.scheduled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close appointment details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Customer</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedAppointment.customer_name || 'Unknown customer'}
                </p>
                {selectedAppointment.customer_email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedAppointment.customer_email}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100">
                  {selectedAppointment.status.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Time</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(selectedAppointment.scheduled_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Duration</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedAppointment.duration_minutes} min
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  ${Number(selectedAppointment.total_price || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {selectedAppointment.services && selectedAppointment.services.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Services</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAppointment.services.map((service, index) => (
                    <span
                      key={`${service.name}-${index}`}
                      className="px-2 py-1 text-xs rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200"
                    >
                      {service.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(selectedAppointment.pet_grooming_notes || selectedAppointment.pet_temperament_notes) && (
              <div className="mb-6 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {selectedAppointment.pet_grooming_notes && (
                  <p>
                    <span className="font-semibold">Grooming notes:</span>{' '}
                    {selectedAppointment.pet_grooming_notes}
                  </p>
                )}
                {selectedAppointment.pet_temperament_notes && (
                  <p>
                    <span className="font-semibold">Temperament:</span>{' '}
                    {selectedAppointment.pet_temperament_notes}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Quick Reschedule
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Reschedule date"
                />
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  aria-label="Reschedule time"
                />
                <button
                  onClick={handleModalReschedule}
                  disabled={
                    !rescheduleDate ||
                    !rescheduleTime ||
                    reschedulingAppointmentId === selectedAppointment.id
                  }
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {reschedulingAppointmentId === selectedAppointment.id ? 'Updating...' : 'Apply'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Internal Notes & Tags
              </p>
              <textarea
                value={internalNotesDraft}
                onChange={(e) => setInternalNotesDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Add internal notes or tags (use #tag syntax)..."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-wrap gap-2">
                  {internalNoteTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={saveInternalNotes}
                  disabled={savingNotes}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Update Status
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() =>
                      updateAppointmentStatus(selectedAppointment.id, status)
                    }
                    disabled={updatingStatus === status}
                    className={`w-full px-4 py-2 rounded-lg text-left font-medium capitalize transition-colors ${
                      selectedAppointment.status === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${updatingStatus === status ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-between">
              <button
                onClick={() => {
                  navigate(`/admin/messages?customerId=${selectedAppointment.customer_id}`);
                  setSelectedAppointment(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg font-medium hover:bg-primary-200"
              >
                <MessageCircle className="w-4 h-4" />
                Message Customer
              </button>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

