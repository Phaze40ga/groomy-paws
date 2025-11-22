import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api, Service } from '../../lib/api';
import { BreedSearch } from '../../components/BreedSearch';
import { Plus, Edit, Trash2, X } from 'lucide-react';

type BreedPrice = {
  breed: string;
  price: string;
  customBreedName?: string; // For "Other" option
};

// Import breeds from BreedSearch component
const OTHER_BREED_OPTION = 'Other';

// Re-export breeds list for use in this component
const COMMON_DOG_BREEDS = [
  'Golden Doodle', 'Labradoodle', 'Bernedoodle', 'Aussiedoodle', 'Sheepadoodle',
  'Cockapoo', 'Cavapoo', 'Maltipoo', 'Yorkipoo', 'Schnoodle', 'Shihpoo', 'Pomapoo', 'Doodle Mix',
  'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Great Dane', 'Rottweiler',
  'Boxer', 'Mastiff', 'Saint Bernard', 'Newfoundland', 'Bernese Mountain Dog', 'Great Pyrenees',
  'Irish Setter', 'English Setter', 'Weimaraner', 'Vizsla', 'Rhodesian Ridgeback',
  'Doberman Pinscher', 'Alaskan Malamute', 'Siberian Husky', 'Samoyed', 'Akita', 'Chow Chow',
  'Border Collie', 'Australian Shepherd', 'Australian Cattle Dog', 'Cocker Spaniel',
  'English Springer Spaniel', 'Brittany', 'Pointer', 'English Bulldog', 'French Bulldog',
  'Bulldog', 'Pit Bull Terrier', 'Staffordshire Terrier', 'American Staffordshire Terrier',
  'Bull Terrier', 'Shar Pei', 'Basset Hound', 'Bloodhound', 'Beagle', 'Coonhound', 'Foxhound',
  'Whippet', 'Greyhound', 'Standard Poodle', 'Portuguese Water Dog', 'Schnauzer',
  'Airedale Terrier', 'Welsh Terrier', 'Scottish Terrier', 'West Highland White Terrier',
  'Cairn Terrier', 'Jack Russell Terrier', 'Rat Terrier', 'Shiba Inu', 'Basenji',
  'Yorkshire Terrier', 'Dachshund', 'Shih Tzu', 'Chihuahua', 'Pomeranian', 'Maltese',
  'Bichon Frise', 'Cavalier King Charles Spaniel', 'Boston Terrier', 'Havanese',
  'Shetland Sheepdog', 'Miniature Poodle', 'Toy Poodle', 'Miniature Schnauzer', 'Pug',
  'Pekingese', 'Lhasa Apso', 'Tibetan Terrier', 'Papillon', 'Italian Greyhound',
  'Miniature Pinscher', 'Toy Fox Terrier', 'Affenpinscher', 'Brussels Griffon',
  'Chinese Crested', 'Japanese Chin',
  'Afghan Hound', 'Old English Sheepdog', 'Briard', 'Komondor', 'Puli', 'Bearded Collie',
  'Collie', 'Rough Collie', 'Smooth Collie', 'Gordon Setter', 'English Cocker Spaniel',
  'American Cocker Spaniel', 'Welsh Springer Spaniel', 'Irish Water Spaniel',
  'Curly-Coated Retriever', 'Flat-Coated Retriever', 'Chesapeake Bay Retriever',
  'Nova Scotia Duck Tolling Retriever', 'Keeshond', 'American Eskimo Dog', 'Schipperke',
  'Löwchen', 'Coton de Tulear', 'Bolognese',
  'Irish Terrier', 'Kerry Blue Terrier', 'Soft Coated Wheaten Terrier', 'Bedlington Terrier',
  'Dandie Dinmont Terrier', 'Skye Terrier', 'Norwich Terrier', 'Norfolk Terrier',
  'Border Terrier', 'Lakeland Terrier', 'Wire Fox Terrier', 'Smooth Fox Terrier',
  'Parson Russell Terrier', 'Staffordshire Bull Terrier', 'American Pit Bull Terrier',
  'Dalmatian', 'German Shorthaired Pointer', 'German Wirehaired Pointer', 'English Pointer',
  'Spinone Italiano', 'Wirehaired Pointing Griffon', 'American Water Spaniel',
  'Boykin Spaniel', 'Clumber Spaniel', 'Field Spaniel', 'Sussex Spaniel',
];

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [breedPrices, setBreedPrices] = useState<BreedPrice[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    duration_minutes: '',
    is_addon: false,
  });

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      const { services: allServices } = await api.getServices();
      // Sort by is_addon
      allServices.sort((a, b) => (a.is_addon ? 1 : 0) - (b.is_addon ? 1 : 0));
      setServices(allServices || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate form data
    if (!formData.name.trim()) {
      alert('Please enter a service name');
      return;
    }
    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      alert('Please enter a valid base price');
      return;
    }
    if (!formData.duration_minutes || parseInt(formData.duration_minutes) <= 0) {
      alert('Please enter a valid duration');
      return;
    }

    // Validate breed prices
    for (const breedPrice of breedPrices) {
      // Check if breed is set (either from list or custom)
      const hasBreed = breedPrice.breed && breedPrice.breed !== OTHER_BREED_OPTION;
      const hasCustomBreed = breedPrice.breed === OTHER_BREED_OPTION && breedPrice.customBreedName?.trim();
      
      if (!hasBreed && !hasCustomBreed) {
        // Skip empty breed price entries
        continue;
      }
      
      if (breedPrice.breed === OTHER_BREED_OPTION && !breedPrice.customBreedName?.trim()) {
        alert('Please enter a breed name for custom breeds');
        return;
      }
      if (!breedPrice.price || breedPrice.price.trim() === '') {
        const breedName = breedPrice.breed === OTHER_BREED_OPTION 
          ? breedPrice.customBreedName 
          : breedPrice.breed;
        alert(`Please enter a price for ${breedName || 'this breed'}`);
        return;
      }
      if (parseFloat(breedPrice.price) <= 0) {
        const breedName = breedPrice.breed === OTHER_BREED_OPTION 
          ? breedPrice.customBreedName 
          : breedPrice.breed;
        alert(`Price must be greater than 0 for ${breedName || 'this breed'}`);
        return;
      }
    }

    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        duration_minutes: parseInt(formData.duration_minutes),
        is_addon: formData.is_addon,
        is_active: true,
      };

      let serviceId: string;
      if (editingService) {
        await api.updateService(editingService.id, serviceData);
        serviceId = editingService.id;
      } else {
        const result = await api.createService(serviceData);
        serviceId = result.service.id;
      }

      // Delete existing prices if editing, then add new ones
      if (editingService) {
        try {
          await api.deleteAllServicePrices(serviceId);
          console.log(`Deleted existing prices for service ${serviceId}`);
        } catch (error) {
          console.error('Error deleting existing prices:', error);
          // Continue anyway - we'll try to add new prices
        }
      }

      // Save breed-based prices (only non-empty ones)
      const priceErrors: string[] = [];
      const savedPrices: string[] = [];
      
      for (const breedPrice of breedPrices) {
        // Skip empty entries
        const hasBreed = breedPrice.breed && breedPrice.breed !== OTHER_BREED_OPTION;
        const hasCustomBreed = breedPrice.breed === OTHER_BREED_OPTION && breedPrice.customBreedName?.trim();
        const hasPrice = breedPrice.price && breedPrice.price.trim() !== '';
        
        if (!hasBreed && !hasCustomBreed) continue;
        if (!hasPrice) continue;
        
        try {
          // Use customBreedName if "Other" is selected, otherwise use breed
          const finalBreed = breedPrice.breed === OTHER_BREED_OPTION 
            ? (breedPrice.customBreedName?.trim() || '')
            : breedPrice.breed.trim();
          
          if (finalBreed && breedPrice.price) {
            await api.addServicePrice(
              serviceId,
              finalBreed,
              parseFloat(breedPrice.price)
            );
            savedPrices.push(finalBreed);
          }
        } catch (error: any) {
          console.error('Error adding price:', error);
          const breedName = breedPrice.breed === OTHER_BREED_OPTION 
            ? breedPrice.customBreedName 
            : breedPrice.breed;
          priceErrors.push(`${breedName || 'Unknown'}: ${error.message || 'Failed to save'}`);
        }
      }

      // Store editing state before closing form
      const wasEditing = !!editingService;
      const hadBreedPrices = breedPrices.length > 0;
      
      // Show success message
      if (priceErrors.length > 0) {
        const shouldContinue = confirm(
          `Service ${wasEditing ? 'updated' : 'saved'}, but some breed prices failed to save:\n${priceErrors.join('\n')}\n\nDo you want to close the form anyway?`
        );
        if (!shouldContinue) {
          // Keep form open so user can fix errors
          return;
        }
      }
      
      // Close form and reset on success
      setShowForm(false);
      setEditingService(null);
      resetForm();
      
      // Reload services to show updated data
      await loadServices();
      
      // Show success message after reload
      if (savedPrices.length > 0) {
        alert(`Service ${wasEditing ? 'updated' : 'created'} successfully with ${savedPrices.length} breed price(s)!`);
      } else if (!hadBreedPrices) {
        alert(`Service ${wasEditing ? 'updated' : 'created'} successfully!`);
      }
    } catch (error: any) {
      console.error('Error saving service:', error);
      alert(`Failed to save service: ${error.message || 'Unknown error'}`);
      // Don't close the form on error so user can fix and retry
    }
  }

  async function handleDelete(serviceId: string) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await api.updateService(serviceId, { is_active: false });
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Failed to delete service');
    }
  }

  async function handleEdit(service: Service) {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      base_price: Number(service.base_price).toString(),
      duration_minutes: service.duration_minutes.toString(),
      is_addon: service.is_addon,
    });
    
    // Load existing prices for this service
    try {
      const { prices } = await api.getServicePrices(service.id);
      // Convert to form format
      const formPrices: BreedPrice[] = prices.map(p => {
        const breedName = p.breed || '';
        // Check if breed is in common list, if not, it's "Other"
        const isCommonBreed = COMMON_DOG_BREEDS.includes(breedName);
        return {
          breed: isCommonBreed ? breedName : OTHER_BREED_OPTION,
          customBreedName: isCommonBreed ? '' : breedName,
          price: Number(p.price).toString(),
        };
      });
      setBreedPrices(formPrices);
    } catch (error) {
      console.error('Error loading prices:', error);
      setBreedPrices([]);
    }
    
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      base_price: '',
      duration_minutes: '',
      is_addon: false,
    });
    setEditingService(null);
    setBreedPrices([]);
  }

  function handleCancel() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      setShowForm(false);
      setEditingService(null);
      resetForm();
    }
  }

  function addBreedPrice() {
    setBreedPrices([...breedPrices, { breed: '', price: '', customBreedName: '' }]);
  }

  function removeBreedPrice(index: number) {
    setBreedPrices(breedPrices.filter((_, i) => i !== index));
  }

  function updateBreedPrice(index: number, field: 'breed' | 'price', value: string) {
    const updated = [...breedPrices];
    updated[index] = { ...updated[index], [field]: value };
    setBreedPrices(updated);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Services Management</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage grooming services and pricing</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter service name"
                    title="Service name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base Price ($) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.00"
                    title="Base price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="30"
                    title="Duration in minutes"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_addon}
                      onChange={(e) =>
                        setFormData({ ...formData, is_addon: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 focus:ring-2 focus:ring-pink-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add-On Service</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter service description"
                  title="Service description"
                />
              </div>

              {/* Breed-Based Pricing Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Breed-Based Pricing</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Set different prices for different dog breeds (optional)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addBreedPrice}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Breed Price
                  </button>
                </div>

                {breedPrices.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">No breed-based prices set. Base price will be used for all breeds.</p>
                ) : (
                  <div className="space-y-3">
                    {breedPrices.map((breedPrice, index) => {
                      const usedBreeds = breedPrices
                        .map((bp, i) => {
                          if (i === index) return '';
                          // Check both breed and customBreedName for used breeds
                          return bp.breed === OTHER_BREED_OPTION ? bp.customBreedName || '' : bp.breed;
                        })
                        .filter(Boolean);

                      return (
                        <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Dog Breed
                            </label>
                            <BreedSearch
                              value={breedPrice.breed === OTHER_BREED_OPTION ? (breedPrice.customBreedName || '') : (breedPrice.breed || '')}
                              onChange={(searchValue) => {
                                // If it's a match from the list, select it
                                const exactMatch = COMMON_DOG_BREEDS.find(b => b.toLowerCase() === searchValue.toLowerCase());
                                if (exactMatch && !usedBreeds.includes(exactMatch)) {
                                  const updated = [...breedPrices];
                                  updated[index] = { ...updated[index], breed: exactMatch, customBreedName: '' };
                                  setBreedPrices(updated);
                                } else if (searchValue.trim()) {
                                  // Allow typing custom breed
                                  const updated = [...breedPrices];
                                  updated[index] = { ...updated[index], breed: OTHER_BREED_OPTION, customBreedName: searchValue };
                                  setBreedPrices(updated);
                                } else {
                                  // Clear if empty
                                  const updated = [...breedPrices];
                                  updated[index] = { ...updated[index], breed: '', customBreedName: '', price: '' };
                                  setBreedPrices(updated);
                                }
                              }}
                              onSelect={(selectedBreed) => {
                                if (!usedBreeds.includes(selectedBreed)) {
                                  const updated = [...breedPrices];
                                  updated[index] = { ...updated[index], breed: selectedBreed, customBreedName: '' };
                                  setBreedPrices(updated);
                                }
                              }}
                              placeholder="Type to search for a breed..."
                              usedBreeds={usedBreeds}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={breedPrice.price}
                              onChange={(e) => updateBreedPrice(index, 'price', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeBreedPrice(index)}
                            className="mt-6 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                >
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-200">
          {/* Horizontal scroll container for mobile */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                      Description
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Base Price
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Duration
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Type
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{service.name}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs sm:max-w-md break-words">
                          {service.description || <span className="text-gray-400 dark:text-gray-500 italic">No description</span>}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          ${Number(service.base_price).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {service.duration_minutes} min
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                            service.is_addon
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          }`}
                        >
                          {service.is_addon ? 'Add-On' : 'Main Service'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-primary-600 hover:text-primary-800 transition-colors"
                            aria-label="Edit service"
                            title="Edit service"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            aria-label="Delete service"
                            title="Delete service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
