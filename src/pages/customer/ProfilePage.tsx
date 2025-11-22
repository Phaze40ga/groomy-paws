import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api, SavedCard, Appointment } from '../../lib/api';
import {
  User,
  Save,
  CreditCard,
  Plus,
  Trash2,
  Star,
  Camera,
  X,
  Calendar,
  Phone,
  MapPin,
  Shield,
  Sparkles,
  Heart,
  Send,
} from 'lucide-react';

export function ProfilePage() {
  const { user, updateProfile, loadCurrentUser } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardName: '',
    expMonth: '',
    expYear: '',
    cvv: '',
  });
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [communicationPrefs, setCommunicationPrefs] = useState({
    email: true,
    sms: true,
    push: false,
  });

  useEffect(() => {
    // Only load cards for customers
    if (!isAdmin) {
      loadCards();
      loadAppointmentInsights();
    }
    if (user?.profile_picture_url) {
      setPreviewImage(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${user.profile_picture_url}`);
    }
  }, [user, isAdmin]);

  async function loadCards() {
    try {
      const { cards: userCards } = await api.getCards();
      setCards(userCards || []);
    } catch (err) {
      console.error('Error loading cards:', err);
    } finally {
      setLoadingCards(false);
    }
  }

  async function loadAppointmentInsights() {
    try {
      const { appointments } = await api.getAppointments();
      if (!appointments) return;
      const now = new Date();
      const upcoming = appointments
        .filter((apt) => new Date(apt.scheduled_at) > now && apt.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];
      const completed = appointments.filter((apt) => apt.status === 'completed').length;
      setNextAppointment(upcoming || null);
      setCompletedAppointments(completed);
      setLoyaltyPoints(completed * 10);
    } catch (error) {
      console.error('Error loading appointment insights', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateProfile(formData);
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // In a real app, you'd use Stripe Elements to securely tokenize the card
      // For now, this is a placeholder that simulates adding a card
      // You would need to integrate Stripe.js on the frontend
      
      // Simulated card data - replace with actual Stripe integration
      const last4 = cardForm.cardNumber.slice(-4);
      const brand = getCardBrand(cardForm.cardNumber);
      
      // This would normally come from Stripe PaymentMethod creation
      const mockStripePaymentMethodId = `pm_${Math.random().toString(36).substr(2, 9)}`;
      
      await api.addCard({
        card_last4: last4,
        card_brand: brand,
        card_exp_month: parseInt(cardForm.expMonth),
        card_exp_year: parseInt(cardForm.expYear),
        stripe_payment_method_id: mockStripePaymentMethodId,
        is_default: cards.length === 0, // First card is default
      });

      setMessage('Card added successfully!');
      setShowAddCard(false);
      setCardForm({ cardNumber: '', cardName: '', expMonth: '', expYear: '', cvv: '' });
      loadCards();
    } catch (err) {
      const error = err as Error;
      setMessage(`Failed to add card: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(cardId: string) {
    try {
      await api.updateCard(cardId, { is_default: true });
      loadCards();
    } catch (err) {
      console.error('Failed to set default card:', err);
      alert('Failed to set default card');
    }
  }

  async function handleDeleteCard(cardId: string) {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      await api.deleteCard(cardId);
      loadCards();
    } catch (err) {
      console.error('Failed to delete card:', err);
      alert('Failed to delete card');
    }
  }

  function getCardBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    if (num.startsWith('3')) return 'American Express';
    if (num.startsWith('6')) return 'Discover';
    return 'Unknown';
  }

  function formatCardNumber(value: string): string {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setUploadingImage(true);
    try {
      await api.uploadProfilePicture(file);
      setMessage('Profile picture updated successfully!');
      // Reload user to get updated profile picture
      await loadCurrentUser();
    } catch (err) {
      const error = err as Error;
      setMessage(`Failed to upload image: ${error.message || 'Unknown error'}`);
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteProfilePicture() {
    if (!confirm('Are you sure you want to delete your profile picture?')) return;

    try {
      await api.deleteProfilePicture();
      setPreviewImage(null);
      setMessage('Profile picture deleted successfully!');
      await loadCurrentUser();
    } catch (err) {
      const error = err as Error;
      setMessage(`Failed to delete image: ${error.message || 'Unknown error'}`);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with gradient background */}
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-2xl shadow-xl p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture with enhanced styling */}
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gradient-to-br from-pink-200 to-blue-200 flex items-center justify-center border-4 border-white/90 shadow-2xl ring-4 ring-white/50">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={user?.name || 'Profile'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <User className="w-16 h-16 md:w-20 md:h-20 text-pink-600" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 w-12 h-12 bg-white text-pink-600 rounded-full flex items-center justify-center shadow-xl hover:bg-pink-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 hover:rotate-12"
                aria-label="Upload profile picture"
              >
                {uploadingImage ? (
                  <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Camera className="w-6 h-6" />
                )}
              </button>
              {previewImage && (
                <button
                  onClick={handleDeleteProfilePicture}
                  className="absolute top-0 right-0 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110"
                  aria-label="Delete profile picture"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Upload profile picture"
                title="Upload profile picture"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black mb-2 drop-shadow-lg">{user?.name}</h1>
              <p className="text-white/90 text-lg mb-2">{user?.email}</p>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                {user?.role === 'admin' || user?.role === 'staff' ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-sm font-semibold">Staff Member</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    <span className="text-sm font-semibold">Customer</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Highlights */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Loyalty points',
              value: loyaltyPoints,
              description: 'Earned across completed visits',
              icon: Sparkles,
              color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-200',
            },
            {
              label: 'Completed visits',
              value: completedAppointments,
              description: 'All-time pampered sessions',
              icon: Star,
              color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-200',
            },
            {
              label: 'Next appointment',
              value: nextAppointment
                ? new Date(nextAppointment.scheduled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Not booked',
              description: nextAppointment
                ? new Date(nextAppointment.scheduled_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Plan your next visit',
              icon: Calendar,
              color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200',
            },
            {
              label: 'Saved cards',
              value: cards.length,
              description: 'Ready for faster checkout',
              icon: CreditCard,
              color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-200',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 border border-gray-100 dark:border-gray-700 flex items-start gap-4 transition-all duration-200 hover:shadow-lg"
            >
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personal Information</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Update your account details</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div
                className={`px-4 py-3 rounded-xl text-sm font-medium shadow-sm animate-in fade-in duration-300 ${
                  message.includes('success')
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {message}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-gray-50 dark:bg-gray-700 hover:bg-white dark:hover:bg-gray-600 resize-none text-gray-900 dark:text-gray-100"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl font-semibold hover:from-pink-700 hover:to-pink-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Cards - Only for customers */}
        {!isAdmin && (
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-pink-100 to-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-pink-600" />
                </div>
                Saved Payment Methods
              </h2>
              <p className="text-gray-600 text-sm">Manage your saved cards for quick checkout</p>
            </div>
            {!showAddCard && (
              <button
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl hover:from-pink-700 hover:to-pink-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Card
              </button>
            )}
          </div>

          {showAddCard && (
            <form onSubmit={handleAddCard} className="mb-6 p-6 border-2 border-pink-200 rounded-2xl bg-gradient-to-br from-pink-50 to-blue-50 shadow-inner">
              <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-600" />
                Add New Card
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardForm.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      setCardForm({ ...cardForm, cardNumber: formatted });
                    }}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardForm.cardName}
                    onChange={(e) => setCardForm({ ...cardForm, cardName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={cardForm.expMonth}
                      onChange={(e) => setCardForm({ ...cardForm, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                      placeholder="MM"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={cardForm.expYear}
                      onChange={(e) => setCardForm({ ...cardForm, expYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="YYYY"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      id="cvv"
                      type="text"
                      required
                      maxLength={4}
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="123"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl hover:from-pink-700 hover:to-pink-800 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? 'Adding...' : 'Add Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCard(false);
                      setCardForm({ cardNumber: '', cardName: '', expMonth: '', expYear: '', cvv: '' });
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {loadingCards ? (
            <div className="text-center py-8 text-gray-500">Loading cards...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <CreditCard className="w-10 h-10 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-700">No saved cards</p>
              <p className="text-sm mt-2 text-gray-500">Add a card to make payments faster</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`p-5 border-2 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-lg ${
                    card.is_default 
                      ? 'border-pink-500 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-pink-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      card.is_default 
                        ? 'bg-gradient-to-br from-pink-500 to-rose-500' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${card.is_default ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-lg">
                          {card.card_brand} •••• {card.card_last4}
                        </span>
                        {card.is_default && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-600 text-white text-xs font-semibold rounded-full">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Expires {String(card.card_exp_month).padStart(2, '0')}/{card.card_exp_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        className="px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-200 border border-pink-200 hover:border-pink-300"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                      aria-label="Delete card"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Preferences & Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Communication Preferences
            </h3>
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email updates', description: 'Booking confirmations, receipts, reminders' },
                { key: 'sms', label: 'SMS alerts', description: 'Day-of reminders & ready-for-pickup texts' },
                { key: 'push', label: 'Push notifications', description: 'Real-time status changes' },
              ].map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-pink-200 dark:hover:border-pink-500 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={communicationPrefs[key as keyof typeof communicationPrefs]}
                    onChange={() =>
                      setCommunicationPrefs((prev) => ({
                        ...prev,
                        [key]: !prev[key as keyof typeof communicationPrefs],
                      }))
                    }
                    className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              Quick actions
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: 'Book a visit',
                  description: 'Schedule a new spa day',
                  to: '/book',
                  icon: Calendar,
                },
                {
                  label: 'Update contact info',
                  description: 'Keep your details current',
                  to: '/profile',
                  icon: Phone,
                },
                {
                  label: 'Manage addresses',
                  description: 'Edit pick-up/drop-off details',
                  to: '/profile',
                  icon: MapPin,
                },
                {
                  label: 'Invite a friend',
                  description: 'Share the love & earn rewards',
                  to: '/messages',
                  icon: Send,
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-pink-300 dark:hover:border-pink-500 transition-colors flex items-start gap-3"
                >
                  <div className="p-2 bg-pink-50 dark:bg-pink-900/30 rounded-lg">
                    <action.icon className="w-4 h-4 text-pink-600 dark:text-pink-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{action.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
