import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const LocationSelector = ({ isOpen, onClose, onLocationSelect }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi

  // Mock search results - in a real app, you'd use a geocoding service
  const mockSearchResults = [
    {
      id: 1,
      name: 'Connaught Place, New Delhi',
      address: 'Connaught Place, New Delhi, Delhi 110001',
      coordinates: { lat: 28.6304, lng: 77.2177 }
    },
    {
      id: 2,
      name: 'India Gate, New Delhi',
      address: 'India Gate, Rajpath, New Delhi, Delhi 110003',
      coordinates: { lat: 28.6129, lng: 77.2295 }
    },
    {
      id: 3,
      name: 'Red Fort, Delhi',
      address: 'Netaji Subhash Marg, Lal Qila, Chandni Chowk, New Delhi, Delhi 110006',
      coordinates: { lat: 28.6562, lng: 77.2410 }
    },
    {
      id: 4,
      name: 'Lotus Temple, Delhi',
      address: 'Lotus Temple Rd, Bahapur, Shambhu Dayal Bagh, Kalkaji, New Delhi, Delhi 110019',
      coordinates: { lat: 28.5535, lng: 77.2588 }
    },
    {
      id: 5,
      name: 'Qutub Minar, Delhi',
      address: 'Seth Sarai, Mehrauli, New Delhi, Delhi 110030',
      coordinates: { lat: 28.5245, lng: 77.1855 }
    }
  ];

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filtered = mockSearchResults.filter(result =>
        result.name.toLowerCase().includes(query.toLowerCase()) ||
        result.address.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearching(false);
    }, 500);
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setMapCenter(location.coordinates);
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect({
        address: selectedLocation.address,
        coordinates: [selectedLocation.coordinates.lng, selectedLocation.coordinates.lat]
      });
    }
  };

  const handleMapClick = (event) => {
    // In a real implementation, you'd get coordinates from the map click event
    const mockClickedLocation = {
      id: 'custom',
      name: 'Selected Location',
      address: `Custom location at ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}`,
      coordinates: mapCenter
    };
    setSelectedLocation(mockClickedLocation);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Search Panel */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search for a location..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleLocationClick(result)}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-all duration-200
                        ${selectedLocation?.id === result.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-medium text-gray-900">{result.name}</h3>
                          <p className="text-sm text-gray-600">{result.address}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No locations found</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Search for a location or click on the map</p>
                </div>
              )}
            </div>
          </div>

          {/* Map Panel */}
          <div className="flex-1 relative">
            {/* Mock Map */}
            <div 
              className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center cursor-crosshair"
              onClick={handleMapClick}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center mb-4 mx-auto">
                  <MapPinIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Interactive Map</h3>
                <p className="text-gray-600 max-w-xs">
                  Click anywhere on the map to select a location, or search for a specific place
                </p>
                {selectedLocation && (
                  <div className="mt-4 p-3 bg-white rounded-lg shadow-md max-w-sm mx-auto">
                    <p className="text-sm font-medium text-gray-900">{selectedLocation.name}</p>
                    <p className="text-xs text-gray-600">{selectedLocation.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-bold text-gray-600">+</span>
              </button>
              <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
                <span className="text-lg font-bold text-gray-600">−</span>
              </button>
            </div>

            {/* Current Location Button */}
            <button className="absolute bottom-4 right-4 p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
              <MapPinIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedLocation ? (
              <span>Selected: {selectedLocation.name}</span>
            ) : (
              <span>No location selected</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLocation}
              disabled={!selectedLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LocationSelector;
