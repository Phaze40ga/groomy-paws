import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const COMMON_DOG_BREEDS = [
  // Doodle Breeds (Complex Grooming) - Listed First for Easy Access
  'Golden Doodle',
  'Labradoodle',
  'Bernedoodle',
  'Aussiedoodle',
  'Sheepadoodle',
  'Cockapoo',
  'Cavapoo',
  'Maltipoo',
  'Yorkipoo',
  'Schnoodle',
  'Shihpoo',
  'Pomapoo',
  'Doodle Mix',
  
  // Popular Large Breeds
  'Labrador Retriever',
  'Golden Retriever',
  'German Shepherd',
  'Great Dane',
  'Rottweiler',
  'Boxer',
  'Mastiff',
  'Saint Bernard',
  'Newfoundland',
  'Bernese Mountain Dog',
  'Great Pyrenees',
  'Irish Setter',
  'English Setter',
  'Weimaraner',
  'Vizsla',
  'Rhodesian Ridgeback',
  'Doberman Pinscher',
  'Alaskan Malamute',
  'Siberian Husky',
  'Samoyed',
  'Akita',
  'Chow Chow',
  
  // Popular Medium Breeds
  'Border Collie',
  'Australian Shepherd',
  'Australian Cattle Dog',
  'Cocker Spaniel',
  'English Springer Spaniel',
  'Brittany',
  'Pointer',
  'English Bulldog',
  'French Bulldog',
  'Bulldog',
  'Pit Bull Terrier',
  'Staffordshire Terrier',
  'American Staffordshire Terrier',
  'Bull Terrier',
  'Shar Pei',
  'Basset Hound',
  'Bloodhound',
  'Beagle',
  'Coonhound',
  'Foxhound',
  'Whippet',
  'Greyhound',
  'Standard Poodle',
  'Portuguese Water Dog',
  'Schnauzer',
  'Airedale Terrier',
  'Welsh Terrier',
  'Scottish Terrier',
  'West Highland White Terrier',
  'Cairn Terrier',
  'Jack Russell Terrier',
  'Rat Terrier',
  'Shiba Inu',
  'Basenji',
  
  // Popular Small Breeds
  'Yorkshire Terrier',
  'Dachshund',
  'Shih Tzu',
  'Chihuahua',
  'Pomeranian',
  'Maltese',
  'Bichon Frise',
  'Cavalier King Charles Spaniel',
  'Boston Terrier',
  'Havanese',
  'Shetland Sheepdog',
  'Miniature Poodle',
  'Toy Poodle',
  'Miniature Schnauzer',
  'Pug',
  'Pekingese',
  'Lhasa Apso',
  'Tibetan Terrier',
  'Papillon',
  'Italian Greyhound',
  'Miniature Pinscher',
  'Toy Fox Terrier',
  'Affenpinscher',
  'Brussels Griffon',
  'Chinese Crested',
  'Japanese Chin',
  
  // Long-Haired/Complex Grooming Breeds
  'Afghan Hound',
  'Old English Sheepdog',
  'Briard',
  'Komondor',
  'Puli',
  'Bearded Collie',
  'Collie',
  'Rough Collie',
  'Smooth Collie',
  'Gordon Setter',
  'English Cocker Spaniel',
  'American Cocker Spaniel',
  'Welsh Springer Spaniel',
  'Irish Water Spaniel',
  'Curly-Coated Retriever',
  'Flat-Coated Retriever',
  'Chesapeake Bay Retriever',
  'Nova Scotia Duck Tolling Retriever',
  'Keeshond',
  'American Eskimo Dog',
  'Schipperke',
  'Löwchen',
  'Coton de Tulear',
  'Bolognese',
  
  // Terriers (Often Complex)
  'Irish Terrier',
  'Kerry Blue Terrier',
  'Soft Coated Wheaten Terrier',
  'Bedlington Terrier',
  'Dandie Dinmont Terrier',
  'Skye Terrier',
  'Norwich Terrier',
  'Norfolk Terrier',
  'Border Terrier',
  'Lakeland Terrier',
  'Wire Fox Terrier',
  'Smooth Fox Terrier',
  'Parson Russell Terrier',
  'Staffordshire Bull Terrier',
  'American Pit Bull Terrier',
  
  // Other Popular Breeds
  'Dalmatian',
  'German Shorthaired Pointer',
  'German Wirehaired Pointer',
  'English Pointer',
  'Spinone Italiano',
  'Wirehaired Pointing Griffon',
  'American Water Spaniel',
  'Boykin Spaniel',
  'Clumber Spaniel',
  'Field Spaniel',
  'Sussex Spaniel',
];

interface BreedSearchProps {
  value: string;
  onChange: (breed: string) => void;
  onSelect: (breed: string) => void;
  placeholder?: string;
  disabled?: boolean;
  usedBreeds?: string[];
}

export function BreedSearch({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Search for a breed...",
  disabled = false,
  usedBreeds = []
}: BreedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredBreeds, setFilteredBreeds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim()) {
      const searchTerm = value.toLowerCase().trim();
      const filtered = COMMON_DOG_BREEDS.filter(breed => {
        const breedLower = breed.toLowerCase();
        const isUsed = usedBreeds.includes(breed);
        return breedLower.includes(searchTerm) && !isUsed;
      });
      setFilteredBreeds(filtered.slice(0, 10)); // Show top 10 matches
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredBreeds([]);
      setIsOpen(false);
    }
  }, [value, usedBreeds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onChange(newValue);
  }

  function handleSelectBreed(breed: string) {
    onSelect(breed);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }

  function handleClear() {
    onChange('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  function highlightMatch(text: string, searchTerm: string) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="font-bold text-blue-600 dark:text-blue-400">{part}</span>
      ) : (
        part
      )
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim() && filteredBreeds.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
          aria-label="Search for dog breed"
          title="Search for dog breed"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && filteredBreeds.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto transition-colors duration-200">
          {filteredBreeds.map((breed) => (
            <button
              key={breed}
              type="button"
              onClick={() => handleSelectBreed(breed)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 focus:bg-blue-50 dark:focus:bg-gray-700 focus:outline-none transition-colors text-gray-900 dark:text-gray-100"
            >
              {highlightMatch(breed, value.trim())}
            </button>
          ))}
        </div>
      )}

      {isOpen && value.trim() && filteredBreeds.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
          No breeds found. You can still enter a custom breed name.
        </div>
      )}
    </div>
  );
}

