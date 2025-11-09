import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, MapPinIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const EnhancedLocationSelector = ({ isOpen, onClose, onLocationSelect, userAddress }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Mumbai coordinates
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [useAccountAddress, setUseAccountAddress] = useState(false);

  // Component to handle map clicks
  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setUseManualAddress(false);
        setUseAccountAddress(false);
        
        try {
          // Reverse geocoding using Nominatim (free service)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            const location = {
              address: data.display_name,
              coordinates: { lat, lng },
              details: data.address || {}
            };
            setSelectedLocation(location);
            
            // Auto-fill address form if available
            if (data.address) {
              setAddressForm({
                street: `${data.address.house_number || ''} ${data.address.road || ''}`.trim(),
                city: data.address.city || data.address.town || data.address.village || '',
                state: data.address.state || '',
                pincode: data.address.postcode || '',
                country: data.address.country || 'India'
              });
            }
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          // Fallback to coordinates only
          setSelectedLocation({
            address: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            coordinates: { lat, lng }
          });
        }
      }
    });
    return null;
  };

  // Mock search results
  const mockLocations = [
    { id: 1, name: 'Mumbai Central', address: 'Mumbai Central, Mumbai, Maharashtra', lat: 19.0176, lng: 72.8562 },
    { id: 2, name: 'Andheri West', address: 'Andheri West, Mumbai, Maharashtra', lat: 19.1136, lng: 72.8697 },
    { id: 3, name: 'Bandra', address: 'Bandra, Mumbai, Maharashtra', lat: 19.0544, lng: 72.8406 },
    { id: 4, name: 'Powai', address: 'Powai, Mumbai, Maharashtra', lat: 19.1176, lng: 72.9060 },
  ];

  const filteredLocations = mockLocations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLocationClick = (location) => {
    setSelectedLocation({
      address: location.address,
      coordinates: { lat: location.lat, lng: location.lng }
    });
    setMapCenter([location.lat, location.lng]);
    setUseManualAddress(false);
    setUseAccountAddress(false);
  };

  const handleAddressFormChange = (field, value) => {
    setAddressForm(prev => ({ ...prev, [field]: value }));
  };

  const handleManualAddressSubmit = () => {
    const fullAddress = `${addressForm.street}, ${addressForm.city}, ${addressForm.state} ${addressForm.pincode}, ${addressForm.country}`.replace(/,\s*,/g, ',').trim();
    
    const location = {
      address: fullAddress,
      coordinates: { lat: 0, lng: 0 }, // Will be geocoded later if needed
      manual: true,
      details: addressForm
    };
    
    setSelectedLocation(location);
    setUseAccountAddress(false);
  };

  const handleUseAccountAddress = () => {
    if (userAddress) {
      const addressString = typeof userAddress === 'object' ? 
        `${userAddress.street || ''}, ${userAddress.city || ''}, ${userAddress.state || ''} ${userAddress.pincode || ''}`.trim() : 
        userAddress;
      
      setSelectedLocation({
        address: addressString,
        coordinates: userAddress.coordinates || { lat: 0, lng: 0 },
        fromAccount: true
      });
      setUseAccountAddress(true);
      setUseManualAddress(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 w-full max-w-6xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        <div className="flex-1 flex">
          {/* Left Panel */}
          <div className="w-1/3 p-6 border-r border-white/20 overflow-y-auto">
            {/* Location Options */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Choose Location Method</h3>
              
              {/* Account Address Option */}
              {userAddress && (
                <button
                  onClick={handleUseAccountAddress}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    useAccountAddress 
                      ? 'border-blue-400 bg-blue-500/20' 
                      : 'border-white/30 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Use Account Address</p>
                      <p className="text-sm text-gray-300">
                        {typeof userAddress === 'object' ? 
                          `${userAddress.street || ''}, ${userAddress.city || ''}`.trim() : 
                          userAddress
                        }
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Manual Address Option */}
              <button
                onClick={() => {
                  setUseManualAddress(!useManualAddress);
                  setUseAccountAddress(false);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  useManualAddress 
                    ? 'border-green-400 bg-green-500/20' 
                    : 'border-white/30 bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <PencilIcon className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-white">Enter Address Manually</p>
                    <p className="text-sm text-gray-300">Type your address details</p>
                  </div>
                </div>
              </button>

              <div className="text-center text-gray-400 text-sm">
                OR
              </div>

              <div className="p-4 rounded-lg border border-white/30 bg-white/10">
                <p className="font-medium text-white mb-2">Click on Map</p>
                <p className="text-sm text-gray-300">Click anywhere on the map to select location</p>
              </div>
            </div>

            {/* Manual Address Form */}
            {useManualAddress && (
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-white">Address Details</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={addressForm.street}
                    onChange={(e) => handleAddressFormChange('street', e.target.value)}
                    className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={addressForm.city}
                      onChange={(e) => handleAddressFormChange('city', e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={addressForm.state}
                      onChange={(e) => handleAddressFormChange('state', e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={addressForm.pincode}
                      onChange={(e) => handleAddressFormChange('pincode', e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={addressForm.country}
                      onChange={(e) => handleAddressFormChange('country', e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300"
                    />
                  </div>
                  <button
                    onClick={handleManualAddressSubmit}
                    className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Use This Address
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-300"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-2">
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationClick(location)}
                  className="w-full p-3 text-left rounded-lg bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
                >
                  <p className="font-medium text-white">{location.name}</p>
                  <p className="text-sm text-gray-300">{location.address}</p>
                </button>
              ))}
            </div>

            {/* Selected Location */}
            {selectedLocation && (
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400/50 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Selected Location</h4>
                <p className="text-sm text-gray-300">{selectedLocation.address}</p>
              </div>
            )}
          </div>

          {/* Map Panel */}
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="rounded-r-2xl"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapClickHandler />
              {selectedLocation && selectedLocation.coordinates && selectedLocation.coordinates.lat !== 0 && (
                <Marker position={[selectedLocation.coordinates.lat, selectedLocation.coordinates.lng]}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-medium">{selectedLocation.address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t border-white/20">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLocation}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Location
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnhancedLocationSelector;
