import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api, Payment, Appointment, SavedCard } from '../../lib/api';
import { SuccessModal } from '../../components/SuccessModal';
import { CreditCard, Calendar, CheckCircle, XCircle, Clock, DollarSign, Smartphone } from 'lucide-react';

type PaymentWithDetails = Payment & {
  appointment_status?: string;
  customer_name?: string;
  customer_email?: string;
  pet_name?: string;
  scheduled_at?: string;
};

export function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'refunded'>('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    date: string;
    time: string;
    totalPrice: number;
    petName: string;
    method?: string;
    reference?: string | null;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'cash_app'>('card');
  const [referenceNote, setReferenceNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [paymentsRes, appointmentsRes, cardsRes] = await Promise.all([
        api.getPayments(),
        api.getAppointments(),
        api.getCards().catch(() => ({ cards: [] })), // Don't fail if cards endpoint doesn't exist yet
      ]);
      setPayments(paymentsRes.payments || []);
      setAppointments(appointmentsRes.appointments || []);
      setSavedCards(cardsRes.cards || []);
      // Set default card if available
      const defaultCard = cardsRes.cards?.find(c => c.is_default);
      if (defaultCard) {
        setSelectedCardId(defaultCard.id);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const methodMetadata = useMemo(() => {
    return {
      card: {
        label: 'Credit / Debit Card',
        description: 'Securely charge a saved card',
        icon: CreditCard,
      },
      cash: {
        label: 'Cash',
        description: 'Mark as paid in person',
        icon: DollarSign,
      },
      cash_app: {
        label: 'Cash App',
        description: 'Record Cash App payment reference',
        icon: Smartphone,
      },
    } as const;
  }, []);

  async function handlePayNow(appointment: Appointment) {
    if (!confirm(`Pay $${Number(appointment.total_price).toFixed(2)} for this appointment?`)) {
      return;
    }

    try {
      const selectedCard = savedCards.find((c) => c.id === selectedCardId);

      if (paymentMethod === 'card' && !selectedCard) {
        alert('Please select a saved card before paying with card.');
        return;
      }

      await api.createPayment({
        appointment_id: appointment.id,
        amount: Number(appointment.total_price),
        stripe_payment_intent_id: paymentMethod === 'card' ? selectedCard?.stripe_payment_method_id : undefined,
        payment_method: paymentMethod,
        payment_reference:
          paymentMethod === 'card'
            ? selectedCard
              ? `${selectedCard.card_brand} •••• ${selectedCard.card_last4}`
              : null
            : referenceNote || null,
      });

      // Format appointment date and time
      const appointmentDate = new Date(appointment.scheduled_at);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      // Get pet name from appointments array (which includes pet_name from API)
      const fullAppointment = appointments.find((a) => a.id === appointment.id);
      const petName = fullAppointment?.pet_name || 'Your pet';

      // Set success details
      setSuccessDetails({
        date: formattedDate,
        time: formattedTime,
        totalPrice: Number(appointment.total_price),
        petName,
        method: methodMetadata[paymentMethod].label,
        reference:
          paymentMethod === 'card'
            ? selectedCard
              ? `${selectedCard.card_brand} •••• ${selectedCard.card_last4}`
              : null
            : referenceNote || null,
      });
      setShowSuccessModal(true);
      
      loadData();
      setReferenceNote('');
    } catch (error) {
      console.error('Error creating payment:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to record payment: ${message}`);
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  const unpaidAppointments = appointments.filter(apt => {
    const appointmentPayments = payments.filter(p => p.appointment_id === apt.id);
    const hasPaidPayment = appointmentPayments.some(p => p.status === 'paid');
    return !hasPaidPayment && apt.status !== 'cancelled';
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'refunded':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'refunded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">View and manage your payment history</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Select payment method</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(methodMetadata) as Array<'card' | 'cash' | 'cash_app'>).map((method) => {
                const option = methodMetadata[method];
                const Icon = option.icon;
                const selected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-start gap-2 ${
                      selected
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-200'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-pink-300 dark:hover:border-pink-500'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                      <Icon className={`w-4 h-4 ${selected ? 'text-pink-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-xs opacity-80">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payment details</h2>
            {paymentMethod === 'card' ? (
              savedCards.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Add a card in your profile to pay with a saved payment method.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Choose card
                  </label>
                  <select
                    value={selectedCardId || ''}
                    onChange={(e) => setSelectedCardId(e.target.value || null)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                    aria-label="Select saved payment card"
                  >
                    <option value="">Select card...</option>
                    {savedCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.card_brand} •••• {card.card_last4}
                        {card.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {paymentMethod === 'cash'
                    ? 'Notes (optional)'
                    : 'Cash App reference'}
                </label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder={
                    paymentMethod === 'cash'
                      ? 'e.g. Paid in-store, change given'
                      : '$cashapp handle or transaction ID'
                  }
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                />
              </div>
            )}
            <p className="text-xs text-gray-500">
              This method will apply to all “Pay Now” actions below.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['all', 'paid', 'unpaid', 'refunded'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                filter === status
                  ? 'border-b-2 border-pink-600 text-pink-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Unpaid Appointments Section */}
        {unpaidAppointments.length > 0 && filter === 'all' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Unpaid Appointments
            </h2>
            <div className="space-y-3">
              {unpaidAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800 flex items-center justify-between transition-colors duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(appointment.scheduled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Status: {appointment.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          ${Number(appointment.total_price).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{appointment.duration_minutes} min</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Method: {methodMetadata[paymentMethod].label}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePayNow(appointment)}
                        className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
                      >
                        Pay Now
                      </button>
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No payments found</p>
              <p className="text-sm mt-2">
                {filter === 'all'
                  ? 'You have no payment history yet'
                  : `No ${filter} payments found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            Payment for {payment.pet_name || 'Appointment'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {payment.scheduled_at
                              ? new Date(payment.scheduled_at).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Date not available'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-8 space-y-1">
                        <p className="text-sm text-gray-600">
                          Appointment Status: {payment.appointment_status?.replace('_', ' ') || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Payment ID: {payment.id.slice(0, 8)}...
                        </p>
                        {payment.stripe_payment_intent_id && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Stripe: {payment.stripe_payment_intent_id.slice(0, 20)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        ${Number(payment.amount).toFixed(2)}
                      </p>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                      {payment.payment_method && (
                        <p className="text-xs text-gray-500">
                          Method: {payment.payment_method.replace('_', ' ')}
                        </p>
                      )}
                      {payment.payment_reference && (
                        <p className="text-xs text-gray-500">
                          Reference: {payment.payment_reference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessDetails(null);
        }}
        title="Payment Confirmed!"
        message="Your payment has been successfully processed."
        details={
          successDetails
            ? {
                date: successDetails.date,
                time: successDetails.time,
                totalPrice: successDetails.totalPrice,
                petName: successDetails.petName,
                extra: successDetails.method
                  ? `${successDetails.method}${
                      successDetails.reference ? ` • ${successDetails.reference}` : ''
                    }`
                  : undefined,
              }
            : undefined
        }
        actionLabel="View Payments"
        onAction={() => {
          navigate('/payments');
        }}
      />
    </DashboardLayout>
  );
}

