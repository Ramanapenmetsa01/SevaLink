import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SimpleLocationSelector = ({ isOpen, onClose, onLocationSelect }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]); // Default to Mumbai
  const [userLocation, setUserLocation] = useState(null);

  // Get user's current location on component mount
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = [latitude, longitude];
          setMapCenter(location);
          setUserLocation(location);
          
          // Auto-select current location
          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Keep default location if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, [isOpen]);

  // Reverse geocoding function
  const reverseGeocode = async (lat, lng) => {
    try {
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
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates only
      setSelectedLocation({
        address: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        coordinates: { lat, lng }
      });
    }
  };

  // Component to handle map clicks
  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        await reverseGeocode(lat, lng);
      }
    });
    return null;
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

        {/* Instructions */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center space-x-3 text-blue-400">
            <MapPinIcon className="w-5 h-5" />
            <p className="text-sm">
              {userLocation ?
                'Map is centered on your current location. Click anywhere to select a different location.' :
                'Click anywhere on the map to select your location.'
              }
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            className="rounded-none"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler />

            {/* Show only one marker - either selected location or user's current location */}
            {selectedLocation && selectedLocation.coordinates ? (
              <Marker position={[selectedLocation.coordinates.lat, selectedLocation.coordinates.lng]}>
              </Marker>
            ) : userLocation && (
              <Marker position={userLocation}>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="p-4 border-t border-white/20 bg-white/5">
            <h3 className="text-lg font-semibold text-white mb-2">Selected Location</h3>
            <p className="text-gray-300 text-sm mb-2">{selectedLocation.address}</p>
            {selectedLocation.coordinates && (
              <p className="text-xs text-gray-400">
                Coordinates: {selectedLocation.coordinates.lat.toFixed(6)}, {selectedLocation.coordinates.lng.toFixed(6)}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-4 border-t border-white/20">
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

export default SimpleLocationSelector;
