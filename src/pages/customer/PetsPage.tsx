import { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api, Pet } from '../../lib/api';
import { BreedSearch } from '../../components/BreedSearch';
import { Plus, Edit, Trash2, Dog, Camera, X } from 'lucide-react';

export function PetsPage() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    size_category: 'medium' as 'small' | 'medium' | 'large' | 'xl',
    age: '',
    weight: '',
    temperament_notes: '',
    grooming_notes: '',
  });
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadPets();
  }, [user]);

  async function loadPets() {
    if (!user) return;

    try {
      const { pets } = await api.getPets();
      console.log('PetsPage: Loaded pets:', pets);
      pets?.forEach(pet => {
        console.log(`PetsPage: Pet ${pet.name} - photo_url:`, pet.photo_url);
        if (pet.photo_url) {
          const imageUrl = getPetImageUrl(pet.photo_url);
          console.log(`PetsPage: Pet ${pet.name} - constructed image URL:`, imageUrl);
        }
      });
      setPets(pets || []);
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      const petData = {
        name: formData.name.trim(),
        breed: formData.breed.trim() || undefined,
        size_category: formData.size_category || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        temperament_notes: formData.temperament_notes.trim() || undefined,
        grooming_notes: formData.grooming_notes.trim() || undefined,
      };

      if (editingPet) {
        await api.updatePet(editingPet.id, petData);
      } else {
        await api.createPet({
          ...petData,
          owner_id: user.id,
        });
      }

      setShowForm(false);
      setEditingPet(null);
      resetForm();
      await loadPets();
    } catch (error) {
      console.error('Error saving pet:', error);
      alert('Failed to save pet. Please try again.');
    }
  }

  async function handleDelete(petId: string) {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
      await api.deletePet(petId);
      loadPets();
    } catch (error) {
      console.error('Error deleting pet:', error);
      alert('Failed to delete pet. Please try again.');
    }
  }

  function handleEdit(pet: Pet) {
    setEditingPet(pet);
    setFormData({
      name: pet.name || '',
      breed: pet.breed || '',
      size_category: (pet.size_category as 'small' | 'medium' | 'large' | 'xl') || 'medium',
      age: pet.age?.toString() || '',
      weight: pet.weight?.toString() || '',
      temperament_notes: pet.temperament_notes || '',
      grooming_notes: pet.grooming_notes || '',
    });
    setShowForm(true);
  }

  async function handlePetImageSelect(petId: string, e: React.ChangeEvent<HTMLInputElement>) {
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

    setUploadingImages({ ...uploadingImages, [petId]: true });
    try {
      await api.uploadPetPicture(petId, file);
      loadPets(); // Reload to get updated image
    } catch (error: any) {
      alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingImages({ ...uploadingImages, [petId]: false });
      if (fileInputRefs.current[petId]) {
        fileInputRefs.current[petId]!.value = '';
      }
    }
  }

  async function handleDeletePetPicture(petId: string) {
    if (!confirm('Are you sure you want to delete this pet\'s picture?')) return;

    try {
      await api.deletePetPicture(petId);
      loadPets();
    } catch (error: any) {
      alert(`Failed to delete image: ${error.message || 'Unknown error'}`);
    }
  }

  function getPetImageUrl(photoUrl?: string | null): string | null {
    if (!photoUrl) {
      console.log('PetsPage: No photo_url provided');
      return null;
    }
    // If already a full URL, return as is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      console.log('PetsPage: Using full URL:', photoUrl);
      return photoUrl;
    }
    // Otherwise, prepend API URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Ensure photoUrl starts with / if it doesn't already
    const normalizedUrl = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
    const fullUrl = `${apiUrl}${normalizedUrl}`;
    console.log('PetsPage: Constructed image URL:', fullUrl, 'from photoUrl:', photoUrl);
    return fullUrl;
  }

  function resetForm() {
    setFormData({
      name: '',
      breed: '',
      size_category: 'medium',
      age: '',
      weight: '',
      temperament_notes: '',
      grooming_notes: '',
    });
    setEditingPet(null);
  }

  function handleCancel() {
    setShowForm(false);
    resetForm();
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Pets</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your pet profiles</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Pet
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pet Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Max"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Breed
                  </label>
                  <BreedSearch
                    value={formData.breed}
                    onChange={(searchValue) => {
                      setFormData({ ...formData, breed: searchValue });
                    }}
                    onSelect={(selectedBreed) => {
                      setFormData({ ...formData, breed: selectedBreed });
                    }}
                    placeholder="Type to search for a breed..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Size Category
                  </label>
                  <select
                    value={formData.size_category}
                    onChange={(e) => {
                      const newValue = e.target.value as 'small' | 'medium' | 'large' | 'xl';
                      setFormData({
                        ...formData,
                        size_category: newValue,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    title="Select pet size category"
                    aria-label="Pet size category"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperament Notes
                </label>
                <textarea
                  value={formData.temperament_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, temperament_notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Friendly, energetic, good with people..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grooming Notes
                </label>
                <textarea
                  value={formData.grooming_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, grooming_notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Sensitive skin, prefers warm water, doesn't like clippers..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:bg-gray-700/50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  {editingPet ? 'Update Pet' : 'Add Pet'}
                </button>
              </div>
            </form>
          </div>
        )}

        {pets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 border border-gray-200 dark:border-gray-700 dark:border-gray-700 text-center transition-colors duration-200">
            <Dog className="w-16 h-16 text-gray-400 dark:text-gray-500 dark:text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Pets Yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Add your first pet to start booking grooming appointments
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Your First Pet
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {pets.map((pet) => {
              const petImageUrl = getPetImageUrl(pet.photo_url);
              console.log(`PetsPage: Rendering pet ${pet.name}, photo_url: ${pet.photo_url}, imageUrl: ${petImageUrl}`);
              return (
                <div
                key={pet.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 mb-4">
                  {/* Pet Picture */}
                  <div className="relative group flex-shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 shadow-md relative cursor-pointer"
                      onClick={() => fileInputRefs.current[pet.id]?.click()}
                    >
                      {petImageUrl ? (
                        <img
                          src={petImageUrl}
                          alt={pet.name}
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            console.error('PetsPage: Image failed to load:', petImageUrl, 'for pet:', pet.name);
                            // If image fails to load, hide it and show fallback
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.fallback-icon');
                              if (fallback) {
                                (fallback as HTMLElement).style.display = 'flex';
                              }
                            }
                          }}
                          onLoad={(e) => {
                            console.log('PetsPage: Image loaded successfully:', petImageUrl, 'for pet:', pet.name);
                            // Hide fallback when image loads
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.fallback-icon');
                              if (fallback) {
                                (fallback as HTMLElement).style.display = 'none';
                              }
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`fallback-icon absolute inset-0 ${petImageUrl ? 'hidden' : 'flex'} items-center justify-center pointer-events-none`}
                        data-pet-id={pet.id}
                      >
                        <Dog className="w-10 h-10 md:w-12 md:h-12 text-pink-600" />
                      </div>
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-full flex items-center justify-center pointer-events-none">
                        <Camera className="w-6 h-6 md:w-8 md:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {uploadingImages[pet.id] && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {petImageUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePetPicture(pet.id);
                        }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-20"
                        aria-label="Delete pet picture"
                        title="Delete pet picture"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[pet.id] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePetImageSelect(pet.id, e)}
                      className="hidden"
                      aria-label={`Upload picture for ${pet.name}`}
                      title={`Upload picture for ${pet.name}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{pet.name}</h3>
                        <p className="text-sm text-gray-600">
                          {pet.breed && <span>{pet.breed}</span>}
                          {pet.breed && pet.size_category && <span> • </span>}
                          {pet.size_category && (
                            <span className="capitalize">{pet.size_category}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => handleEdit(pet)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Edit pet"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pet.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete pet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {pet.age && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Age:</span>{' '}
                          <span className="font-medium">{pet.age} years</span>
                        </div>
                      )}
                      {pet.weight && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Weight:</span>{' '}
                          <span className="font-medium">{pet.weight} lbs</span>
                        </div>
                      )}
                    </div>

                    {pet.temperament_notes && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Temperament:</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{pet.temperament_notes}</p>
                      </div>
                    )}

                    {pet.grooming_notes && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Grooming Notes:</p>
                        <p className="text-sm text-gray-900 line-clamp-2">{pet.grooming_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
