import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api, Payment } from '../../lib/api';
import { CreditCard, Search, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

type PaymentWithDetails = Payment & {
  appointment_status?: string;
  customer_name?: string;
  customer_email?: string;
  pet_name?: string;
  scheduled_at?: string;
  payment_method?: 'card' | 'cash' | 'cash_app' | 'other';
  payment_reference?: string | null;
};

export function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'refunded'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [paymentMethodDraft, setPaymentMethodDraft] = useState<'card' | 'cash' | 'cash_app' | 'other'>('card');
  const [referenceDraft, setReferenceDraft] = useState('');
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      const { payments: allPayments } = await api.getPayments();
      setPayments(allPayments || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(paymentId: string, newStatus: 'paid' | 'unpaid' | 'refunded') {
    if (!confirm(`Change payment status to ${newStatus}?`)) return;

    try {
      await api.updatePayment(paymentId, { status: newStatus });
      loadPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment status');
    }
  }

  const filteredPayments = payments.filter((payment) => {
    if (filter !== 'all' && payment.status !== filter) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (payment.customer_name || '').toLowerCase().includes(search) ||
      (payment.customer_email || '').toLowerCase().includes(search) ||
      (payment.pet_name || '').toLowerCase().includes(search) ||
      payment.id.toLowerCase().includes(search)
    );
  });

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'refunded':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage all customer payments</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-6 py-4 transition-colors duration-200 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{payments.length}</p>
              </div>
              <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {payments.filter(p => p.status === 'paid').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Unpaid</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {payments.filter(p => p.status === 'unpaid').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Refunded</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {payments.filter(p => p.status === 'refunded').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by customer, pet, or payment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'paid', 'unpaid', 'refunded'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    filter === status
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
          {filteredPayments.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p className="text-gray-900 dark:text-gray-100">No payments found</p>
            </div>
          ) : (
            <>
              <div className="block xl:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">
                          Payment ID
                        </p>
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {payment.id.slice(0, 8)}...
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="sm:max-w-xs">
                        <p className="text-gray-500 dark:text-gray-400">Customer</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {payment.customer_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payment.customer_email || 'No email provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Pet</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {payment.pet_name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Appointment Date</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {payment.scheduled_at
                            ? new Date(payment.scheduled_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Amount</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">
                          ${Number(payment.amount).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Date Paid</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Method</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {payment.payment_method?.replace('_', ' ') || 'N/A'}
                        </p>
                        {payment.payment_reference && (
                          <p className="text-xs text-gray-500">{payment.payment_reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setPaymentMethodDraft(payment.payment_method || 'card');
                          setReferenceDraft(payment.payment_reference || '');
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                      >
                        View Invoice
                      </button>
                      {payment.status !== 'paid' && (
                        <button
                          onClick={() => handleUpdateStatus(payment.id, 'paid')}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                        >
                          Mark Paid
                        </button>
                      )}
                      {payment.status === 'paid' && (
                        <button
                          onClick={() => handleUpdateStatus(payment.id, 'refunded')}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden xl:block">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Payment ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Pet
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Appointment Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Date Paid
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-300">
                          {payment.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                            {payment.customer_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {payment.customer_email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 break-words">
                          {payment.pet_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {payment.scheduled_at
                            ? new Date(payment.scheduled_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          ${Number(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                              payment.status
                            )}`}
                          >
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          <div>{payment.payment_method?.replace('_', ' ') || '—'}</div>
                          {payment.payment_reference && (
                            <div className="text-xs text-gray-500">{payment.payment_reference}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPaymentMethodDraft(payment.payment_method || 'card');
                              setReferenceDraft(payment.payment_reference || '');
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium mr-3"
                          >
                            View Invoice
                          </button>
                          {payment.status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(payment.id, 'paid')}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium mr-3"
                            >
                              Mark Paid
                            </button>
                          )}
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => handleUpdateStatus(payment.id, 'refunded')}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {selectedPayment && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-60"
              onClick={() => setSelectedPayment(null)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-gray-100 dark:border-gray-700 z-50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Invoice #{selectedPayment.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedPayment.customer_name || 'Customer'} • {selectedPayment.pet_name || 'Pet'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
                  aria-label="Close invoice"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    ${Number(selectedPayment.amount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Appointment</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedPayment.scheduled_at
                      ? new Date(selectedPayment.scheduled_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                      selectedPayment.status
                    )}`}
                  >
                    {getStatusIcon(selectedPayment.status)}
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Date Paid</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(selectedPayment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Payment method
                  </label>
                  <select
                    value={paymentMethodDraft}
                    onChange={(e) => setPaymentMethodDraft(e.target.value as typeof paymentMethodDraft)}
                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    aria-label="Select payment method"
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="cash_app">Cash App</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reference / Notes
                  </label>
                  <input
                    type="text"
                    value={referenceDraft}
                    onChange={(e) => setReferenceDraft(e.target.value)}
                    className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Card last 4, cash app handle, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!selectedPayment) return;
                    try {
                      setSavingInvoice(true);
                      await api.updatePayment(selectedPayment.id, {
                        payment_method: paymentMethodDraft,
                        payment_reference: referenceDraft || null,
                      });
                      setSelectedPayment(null);
                      loadPayments();
                    } catch (error) {
                      console.error('Failed to update payment method', error);
                      alert('Failed to update payment method');
                    } finally {
                      setSavingInvoice(false);
                    }
                  }}
                  disabled={savingInvoice}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
                >
                  {savingInvoice ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

