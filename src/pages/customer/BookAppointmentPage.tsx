import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api, Pet, Service, ServicePrice } from '../../lib/api';
import { SuccessModal } from '../../components/SuccessModal';
import { Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react';

export function BookAppointmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [availability, setAvailability] = useState<Array<{
    id?: string;
    user_id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>>([]);
  const [existingAppointments, setExistingAppointments] = useState<Array<{
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    date: string;
    time: string;
    duration: number;
    totalPrice: number;
    petName: string;
    serviceCount: number;
  } | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reload appointments when date changes to update availability
  useEffect(() => {
    if (selectedDate) {
      // Reload appointments to check for conflicts
      api.getAppointments()
        .then(res => setExistingAppointments(res.appointments || []))
        .catch(() => setExistingAppointments([]));
    }
  }, [selectedDate]);

  async function loadData() {
    if (!user) return;

    try {
      const [petsRes, servicesRes, appointmentsRes] = await Promise.all([
        api.getPets(),
        api.getServices(),
        api.getAppointments().catch(() => ({ appointments: [] })),
      ]);

      setPets(petsRes.pets || []);
      setServices(servicesRes.services || []);
      setExistingAppointments(appointmentsRes.appointments || []);

      // Load prices for all services (handle errors gracefully)
      const pricesPromises = servicesRes.services.map(service => 
        api.getServicePrices(service.id).catch(err => {
          console.warn(`Failed to load prices for service ${service.id}:`, err);
          return { prices: [] };
        })
      );
      const pricesResults = await Promise.all(pricesPromises);
      const allPrices = pricesResults.flatMap(result => result.prices || []);
      setServicePrices(allPrices);

      // Load public availability
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/availability/public`);
        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability || []);
        }
      } catch (error) {
        console.warn('Error loading availability:', error);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getServicePrice(serviceId: string): number {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return 0;

    const pet = pets.find((p) => p.id === selectedPet);
    if (!pet?.breed) return Number(service.base_price);

    // Case-insensitive breed matching
    const petBreedLower = pet.breed.toLowerCase().trim();
    const breedPrice = servicePrices.find(
      (sp) => sp.service_id === serviceId && 
              sp.breed && 
              sp.breed.toLowerCase().trim() === petBreedLower
    );

    return breedPrice ? Number(breedPrice.price) : Number(service.base_price);
  }

  function getTotalPrice(): number {
    return selectedServices.reduce((total, serviceId) => {
      return total + getServicePrice(serviceId);
    }, 0);
  }

  function getTotalDuration(): number {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.duration_minutes || 0);
    }, 0);
  }

  function formatTimeTo12Hour(time24: string): string {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function generateTimeSlots(): { time: string; available: boolean; displayTime: string }[] {
    if (!selectedDate) return [];

    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday

    // Find availability for this day of week
    const dayAvailability = availability.find(slot => slot.day_of_week === dayOfWeek && slot.is_available);
    
    if (!dayAvailability) {
      // No availability set for this day
      return [];
    }

    // Parse start and end times
    const [startHour, startMin] = dayAvailability.start_time.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Generate 30-minute slots
    const slots: { time: string; available: boolean; displayTime: string }[] = [];
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const min = minutes % 60;
      const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = formatTimeTo12Hour(time24);

      // Check if this time slot conflicts with existing appointments
      const slotDateTime = new Date(`${selectedDate}T${time24}`);
      const slotEndDateTime = new Date(slotDateTime.getTime() + getTotalDuration() * 60000);
      
      const isBooked = existingAppointments.some(apt => {
        const aptStart = new Date(apt.scheduled_at);
        const aptEnd = new Date(aptStart.getTime() + (apt.duration_minutes || 60) * 60000);
        
        // Check for overlap
        return (slotDateTime < aptEnd && slotEndDateTime > aptStart) && apt.status !== 'cancelled';
      });

      slots.push({
        time: time24,
        available: !isBooked,
        displayTime,
      });
    }

    return slots;
  }

  function getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  async function handleBooking() {
    if (!user || !selectedPet || selectedServices.length === 0 || !selectedDate || !selectedTime) {
      return;
    }

    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);
      const totalPrice = getTotalPrice();
      const totalDuration = getTotalDuration();

      // Validate that we have valid prices
      if (totalPrice <= 0) {
        alert('Please select at least one service');
        return;
      }

      const services = selectedServices.map((serviceId) => {
        const price = getServicePrice(serviceId);
        if (!price || price <= 0) {
          throw new Error(`Invalid price for service ${serviceId}`);
        }
        return {
          service_id: serviceId,
          price: price,
        };
      });

      console.log('Booking appointment with:', {
        pet_id: selectedPet,
        scheduled_at: scheduledAt.toISOString(),
        services,
        total_price: totalPrice,
        duration_minutes: totalDuration,
      });

      await api.createAppointment({
        pet_id: selectedPet,
        scheduled_at: scheduledAt.toISOString(),
        services,
        total_price: totalPrice,
        duration_minutes: totalDuration,
      });

      // Get pet name for success modal
      const pet = pets.find(p => p.id === selectedPet);
      
      // Set success details and show modal
      setSuccessDetails({
        date: selectedDate,
        time: formatTimeTo12Hour(selectedTime),
        duration: totalDuration,
        totalPrice: totalPrice,
        petName: pet?.name || 'Your pet',
        serviceCount: selectedServices.length,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error booking appointment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to book appointment. Please try again.';
      alert(`Failed to book appointment: ${errorMessage}`);
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

  if (pets.length === 0) {
    return (
      <DashboardLayout>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Pets Found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You need to add a pet before booking an appointment
          </p>
          <button
            onClick={() => navigate('/pets')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
          >
            Add Pet
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Book Appointment</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Schedule a grooming session for your pet</p>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {s}
              </div>
              <span
                className={`text-sm font-medium ${
                  step >= s ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {s === 1 ? 'Pet & Services' : s === 2 ? 'Date & Time' : 'Confirm'}
              </span>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    step > s ? 'bg-primary-600 dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Select Pet</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPet(pet.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      selectedPet === pet.id
                        ? 'border-primary-600 bg-pink-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{pet.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {pet.breed} {pet.size_category && `• ${pet.size_category}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Select Services</h2>
              {selectedPet && (() => {
                const selectedPetData = pets.find(p => p.id === selectedPet);
                const hasBreedSpecificServices = selectedPetData?.breed && servicePrices.some(sp => sp.breed === selectedPetData.breed);
                
                if (hasBreedSpecificServices) {
                  return (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">
                        🎯 Special pricing available for <span className="font-bold">{selectedPetData?.breed}</span>!
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Services with breed-specific pricing are highlighted below.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
              
              {!selectedPet && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900">
                    ⚠️ Please select a pet first to see available services and pricing
                  </p>
                </div>
              )}

              {selectedPet && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Selected: <span className="font-bold">{pets.find(p => p.id === selectedPet)?.name}</span>
                    {pets.find(p => p.id === selectedPet)?.breed && (
                      <span className="text-green-700"> ({pets.find(p => p.id === selectedPet)?.breed})</span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium text-gray-700 dark:text-gray-300 text-lg">Main Services</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {services.filter((s) => !s.is_addon).length} service{services.filter((s) => !s.is_addon).length !== 1 ? 's' : ''} available
                    </div>
                  </div>
                  {selectedServices.filter(id => !services.find(s => s.id === id)?.is_addon).length > 0 && (
                    <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1 rounded-full">
                      {selectedServices.filter(id => !services.find(s => s.id === id)?.is_addon).length} selected
                    </div>
                  )}
                </div>
                {services.filter((s) => !s.is_addon).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No main services available at this time.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {services
                      .filter((s) => !s.is_addon)
                      .map((service) => {
                    const pet = pets.find((p) => p.id === selectedPet);
                    const breedPrices = servicePrices.filter(sp => sp.service_id === service.id);
                    // Case-insensitive breed matching
                    const petBreedLower = pet?.breed?.toLowerCase().trim();
                    const hasBreedPrice = petBreedLower && breedPrices.some(sp => 
                      sp.breed && sp.breed.toLowerCase().trim() === petBreedLower
                    );
                    const isRecommended = hasBreedPrice;
                    
                    return (
                      <label
                        key={service.id}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isRecommended
                            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-600 shadow-sm'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                        } ${selectedServices.includes(service.id) ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices([...selectedServices, service.id]);
                            } else {
                              setSelectedServices(
                                selectedServices.filter((id) => id !== service.id)
                              );
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">{service.name}</h3>
                                {isRecommended && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-600 text-white font-semibold">
                                    ⭐ Recommended
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{service.description}</p>
                              )}
                              {(() => {
                                if (breedPrices.length > 0) {
                                  // Case-insensitive breed matching
                                  const petBreedLower = pet?.breed?.toLowerCase().trim();
                                  const petBreedPrice = petBreedLower ? breedPrices.find(sp => 
                                    sp.breed && sp.breed.toLowerCase().trim() === petBreedLower
                                  ) : null;
                                  const otherBreedPrices = breedPrices.filter(sp => 
                                    !sp.breed || !petBreedLower || sp.breed.toLowerCase().trim() !== petBreedLower
                                  ).slice(0, 2);
                                  
                                  return (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      {petBreedPrice && pet?.breed ? (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-green-700 mb-1">
                                            ✓ Special price for {pet.breed}:
                                          </p>
                                          <p className="text-lg font-bold text-green-700">
                                            ${Number(petBreedPrice.price).toFixed(2)}
                                          </p>
                                        </div>
                                      ) : null}
                                      {otherBreedPrices.length > 0 && (
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Other breed pricing:</p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {otherBreedPrices.map(bp => (
                                              <span key={bp.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                {bp.breed}: ${Number(bp.price).toFixed(2)}
                                              </span>
                                            ))}
                                            {breedPrices.length > (petBreedPrice ? 1 : 0) + otherBreedPrices.length && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600">
                                                +{breedPrices.length - (petBreedPrice ? 1 : 0) - otherBreedPrices.length} more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="flex flex-col items-end">
                                {(() => {
                                  const basePrice = Number(service.base_price);
                                  const currentPrice = getServicePrice(service.id);
                                  const isBreedPrice = hasBreedPrice && currentPrice !== basePrice;
                                  
                                  return (
                                    <>
                                      <div className="flex flex-col items-end">
                                        {isBreedPrice && (
                                          <span className="text-xs text-green-600 font-semibold mb-0.5">
                                            {pet?.breed} Price
                                          </span>
                                        )}
                                        <p className={`font-bold text-lg ${isBreedPrice ? 'text-green-700 dark:text-green-400' : isRecommended ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                          ${currentPrice.toFixed(2)}
                                        </p>
                                      </div>
                                      {isBreedPrice && (
                                        <div className="text-xs mt-1">
                                          <span className="text-gray-400 line-through">${basePrice.toFixed(2)}</span>
                                          <span className="block text-green-600 font-semibold mt-0.5">Save ${(basePrice - currentPrice).toFixed(2)}</span>
                                        </div>
                                      )}
                                      {breedPrices.length > 0 && pet?.breed && !hasBreedPrice && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Base price
                                        </p>
                                      )}
                                    </>
                                  );
                                })()}
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.duration_minutes} min
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                  </div>
                )}

                {services.filter((s) => s.is_addon).length > 0 && (
                  <>
                    <div className="flex items-center justify-between mt-8 mb-4">
                      <div>
                        <div className="font-medium text-gray-700 dark:text-gray-300 text-lg">Add-On Services</div>
                        <p className="text-sm text-gray-500 mt-1">Enhance your pet's grooming experience</p>
                      </div>
                      {selectedServices.filter(id => services.find(s => s.id === id)?.is_addon).length > 0 && (
                        <div className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                          {selectedServices.filter(id => services.find(s => s.id === id)?.is_addon).length} selected
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3">
                      {services
                        .filter((s) => s.is_addon)
                        .map((service) => {
                        const pet = pets.find((p) => p.id === selectedPet);
                        const breedPrices = servicePrices.filter(sp => sp.service_id === service.id);
                        // Case-insensitive breed matching
                        const petBreedLower = pet?.breed?.toLowerCase().trim();
                        const hasBreedPrice = petBreedLower && breedPrices.some(sp => 
                          sp.breed && sp.breed.toLowerCase().trim() === petBreedLower
                        );
                        const isRecommended = hasBreedPrice;
                        
                        return (
                          <label
                            key={service.id}
                            className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isRecommended
                                ? 'border-blue-400 bg-blue-50 hover:border-blue-500 shadow-sm'
                                : 'border-gray-200 hover:border-blue-300'
                            } ${selectedServices.includes(service.id) ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, service.id]);
                                } else {
                                  setSelectedServices(
                                    selectedServices.filter((id) => id !== service.id)
                                  );
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{service.name}</h3>
                                    {isRecommended && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-600 text-white font-semibold">
                                        ⭐ Recommended
                                      </span>
                                    )}
                                  </div>
                                  {service.description && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{service.description}</p>
                                  )}
                                  {(() => {
                                    if (breedPrices.length > 0) {
                                      // Case-insensitive breed matching
                                      const petBreedLower = pet?.breed?.toLowerCase().trim();
                                      const petBreedPrice = petBreedLower ? breedPrices.find(sp => 
                                        sp.breed && sp.breed.toLowerCase().trim() === petBreedLower
                                      ) : null;
                                      const otherBreedPrices = breedPrices.filter(sp => 
                                        !sp.breed || !petBreedLower || sp.breed.toLowerCase().trim() !== petBreedLower
                                      ).slice(0, 2);
                                      
                                      return (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                          {petBreedPrice && pet?.breed ? (
                                            <div className="mb-2">
                                              <p className="text-xs font-semibold text-green-700 mb-1">
                                                ✓ Special price for {pet.breed}:
                                              </p>
                                              <p className="text-lg font-bold text-green-700">
                                                ${Number(petBreedPrice.price).toFixed(2)}
                                              </p>
                                            </div>
                                          ) : null}
                                          {otherBreedPrices.length > 0 && (
                                            <div>
                                              <p className="text-xs text-gray-500 mb-1">Other breed pricing:</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                {otherBreedPrices.map(bp => (
                                                  <span key={bp.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    {bp.breed}: ${Number(bp.price).toFixed(2)}
                                                  </span>
                                                ))}
                                                {breedPrices.length > (petBreedPrice ? 1 : 0) + otherBreedPrices.length && (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600">
                                                    +{breedPrices.length - (petBreedPrice ? 1 : 0) - otherBreedPrices.length} more
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                <div className="text-right ml-4 flex-shrink-0">
                                  <div className="flex flex-col items-end">
                                    {(() => {
                                      const basePrice = Number(service.base_price);
                                      const currentPrice = getServicePrice(service.id);
                                      const isBreedPrice = hasBreedPrice && currentPrice !== basePrice;
                                      
                                      return (
                                        <>
                                          <div className="flex flex-col items-end">
                                            {isBreedPrice && (
                                              <span className="text-xs text-green-600 font-semibold mb-0.5">
                                                {pet?.breed} Price
                                              </span>
                                            )}
                                            <p className={`font-bold text-lg ${isBreedPrice ? 'text-green-700 dark:text-green-400' : isRecommended ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                              ${currentPrice.toFixed(2)}
                                            </p>
                                          </div>
                                          {isBreedPrice && (
                                            <div className="text-xs mt-1">
                                              <span className="text-gray-400 line-through">${basePrice.toFixed(2)}</span>
                                              <span className="block text-green-600 font-semibold mt-0.5">Save ${(basePrice - currentPrice).toFixed(2)}</span>
                                            </div>
                                          )}
                                          {breedPrices.length > 0 && pet?.breed && !hasBreedPrice && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              Base price
                                            </p>
                                          )}
                                        </>
                                      );
                                    })()}
                                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {service.duration_minutes} min
                                    </p>
                                  </div>
                                </div>
                              </div>
                          </div>
                        </label>
                      );
                    })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                {selectedServices.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Total:</span> ${getTotalPrice().toFixed(2)} •{' '}
                    {getTotalDuration()} minutes
                  </div>
                )}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedPet || selectedServices.length === 0}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Select Date</h2>
              <input
                type="date"
                min={getMinDate()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                aria-label="Select appointment date"
                title="Select appointment date"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Select Time</h2>
              {!selectedDate ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-medium">Please select a date first</p>
                </div>
              ) : generateTimeSlots().length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-medium">No availability for this day</p>
                  <p className="text-sm mt-1">Please select a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {generateTimeSlots().map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                        !slot.available
                          ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed line-through'
                          : selectedTime === slot.time
                          ? 'border-primary-600 dark:border-primary-500 bg-pink-50 dark:bg-pink-900/20 text-primary-700 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      title={slot.available ? 'Available' : 'Unavailable'}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedTime}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Confirm Booking</h2>

              <div className="space-y-4">
                {/* Pet Information */}
                {selectedPet && (() => {
                  const pet = pets.find(p => p.id === selectedPet);
                  return pet ? (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">Pet</p>
                        <p className="text-gray-700 dark:text-gray-300 font-semibold">{pet.name}</p>
                        {pet.breed && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Breed: {pet.breed}</p>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Date & Time */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Date & Time</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      at {selectedTime}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Estimated Duration</p>
                    <p className="text-gray-600">{getTotalDuration()} minutes</p>
                  </div>
                </div>

                {/* Services */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Services Selected</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {selectedServices.length === 0 ? (
                    <div className="ml-8 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">⚠️ No services selected</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Please go back and select at least one service.</p>
                    </div>
                  ) : (
                    <div className="ml-8 space-y-2">
                      {selectedServices.map((serviceId) => {
                        const service = services.find((s) => s.id === serviceId);
                        const price = getServicePrice(serviceId);
                        const isAddon = service?.is_addon;
                        
                        if (!service) {
                          return (
                            <div key={serviceId} className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                              Service not found (ID: {serviceId})
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={serviceId}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{service.name}</h4>
                                {isAddon && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                                    Add-On
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{service.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {service.duration_minutes} min
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                ${price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Total Price */}
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary-50 to-pink-50 dark:from-primary-900/20 dark:to-pink-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800">
                  <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Total Price</p>
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                      ${getTotalPrice().toFixed(2)}
                    </p>
                    {selectedServices.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} • {getTotalDuration()} minutes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleBooking}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
              >
                Book Appointment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/appointments');
        }}
        title="Appointment Booked!"
        message="Your grooming appointment has been successfully scheduled."
        details={successDetails || undefined}
        actionLabel="View My Appointments"
        onAction={() => navigate('/appointments')}
      />
    </DashboardLayout>
  );
}
