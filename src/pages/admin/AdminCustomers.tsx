import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api, Customer } from '../../lib/api';
import { Search, User, Mail, Phone, Calendar, PawPrint, DollarSign, Eye, Shield, Save } from 'lucide-react';

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const { customers: allCustomers } = await api.getCustomers();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerDetails(customerId: string) {
    setLoadingDetails(true);
    try {
      const details = await api.getCustomer(customerId);
      setCustomerDetails(details);
      setSelectedCustomer(customers.find(c => c.id === customerId) || null);
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleUpdateRole(customerId: string, newRole: 'customer' | 'staff' | 'admin') {
    setUpdatingRole(customerId);
    try {
      await api.updateCustomer(customerId, { role: newRole });
      // Reload customers list
      await loadCustomers();
      // Reload customer details if this customer is selected
      if (selectedCustomer?.id === customerId) {
        await loadCustomerDetails(customerId);
      }
      alert(`User role updated to ${newRole} successfully!`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      alert(`Failed to update role: ${error.message || 'Unknown error'}`);
    } finally {
      setUpdatingRole(null);
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search) ||
      customer.role?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading customers...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">All Users</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage and view all users (admins, staff, and customers)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">No users found</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-pink-300 dark:hover:border-pink-600 transition-colors bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{customer.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                          customer.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800'
                            : customer.role === 'staff'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.role}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <PawPrint className="w-4 h-4" />
                          <span>{customer.pet_count || 0} pets</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{customer.appointment_count || 0} appointments</span>
                        </div>
                      </div>
                      {customer.total_spent && customer.total_spent > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-semibold">
                            Total spent: ${Number(customer.total_spent).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => loadCustomerDetails(customer.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Details Modal */}
        {selectedCustomer && customerDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Details</h2>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerDetails(null);
                    }}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {loadingDetails ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Customer Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Name</label>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">{customerDetails.customer.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
                        <p className="text-gray-900 dark:text-gray-100">{customerDetails.customer.email}</p>
                      </div>
                      {customerDetails.customer.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Phone</label>
                          <p className="text-gray-900 dark:text-gray-100">{customerDetails.customer.phone}</p>
                        </div>
                      )}
                      {customerDetails.customer.address && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Address</label>
                          <p className="text-gray-900 dark:text-gray-100">{customerDetails.customer.address}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Member Since</label>
                        <p className="text-gray-900 dark:text-gray-100">
                          {new Date(customerDetails.customer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Spent</label>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          ${Number(customerDetails.customer.total_spent || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">User Role</label>
                        <div className="flex items-center gap-3">
                          <select
                            value={customerDetails.customer.role || 'customer'}
                            onChange={(e) => {
                              const newRole = e.target.value as 'customer' | 'staff' | 'admin';
                              if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
                                handleUpdateRole(customerDetails.customer.id, newRole);
                              }
                            }}
                            disabled={updatingRole === customerDetails.customer.id}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            title="Select user role"
                            aria-label="User role"
                          >
                            <option value="customer">Customer</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                          {updatingRole === customerDetails.customer.id && (
                            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Changing role will affect user permissions immediately
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pets */}
                  {customerDetails.pets && customerDetails.pets.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Pets ({customerDetails.pets.length})</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {customerDetails.pets.map((pet: any) => (
                          <div key={pet.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{pet.name}</h4>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              {pet.breed && <p>Breed: {pet.breed}</p>}
                              {pet.size_category && <p>Size: {pet.size_category}</p>}
                              {pet.age && <p>Age: {pet.age} years</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Appointments */}
                  {customerDetails.recent_appointments && customerDetails.recent_appointments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Appointments</h3>
                      <div className="space-y-2">
                        {customerDetails.recent_appointments.map((apt: any) => (
                          <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {apt.pet_name} {apt.pet_breed && `(${apt.pet_breed})`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {new Date(apt.scheduled_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium capitalize ${
                                  apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {apt.status.replace('_', ' ')}
                                </span>
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                  ${Number(apt.total_price).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

