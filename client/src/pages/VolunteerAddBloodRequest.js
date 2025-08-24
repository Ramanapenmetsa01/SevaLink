import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import SimpleLocationSelector from '../components/ui/SimpleLocationSelector';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { showError, showSuccess } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext';

const VolunteerAddBloodRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Required fields for backend
    name: '',
    phone: '',
    bloodType: '',
    urgencyLevel: 'medium',
    location: {
      type: 'manual',
      address: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      coordinates: null
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Auto-populate user data when component loads
  useEffect(() => {
    if (user) {
      const updatedFormData = {
        ...formData,
        name: user.name || '',
        phone: user.phone || ''
      };

      // If user has an address, auto-select account address and populate it
      if (user.address) {
        const userAddress = user.address;
        const addressString = typeof userAddress === 'object' ?
          `${userAddress.street || ''}, ${userAddress.city || ''}, ${userAddress.state || ''} ${userAddress.pincode || ''}`.trim() :
          userAddress;

        updatedFormData.location = {
          type: 'account',
          address: addressString,
          street: userAddress.street || '',
          city: userAddress.city || '',
          state: userAddress.state || '',
          pincode: userAddress.pincode || '',
          country: userAddress.country || 'India',
          coordinates: userAddress.coordinates || null
        };
      }

      setFormData(updatedFormData);
    }
  }, [user]);

  const bloodTypeOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  const urgencyOptions = [
    { value: 'low', label: 'Low - Within a week' },
    { value: 'medium', label: 'Medium - Within 3 days' },
    { value: 'high', label: 'High - Within 24 hours' },
    { value: 'urgent', label: 'Urgent - Immediate need' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');

      // Special handling for location type change
      if (field === 'location.type') {
        if (value === 'account' && user?.address) {
          // Auto-populate account address
          const userAddress = user.address;
          const addressString = typeof userAddress === 'object' ?
            `${userAddress.street || ''}, ${userAddress.city || ''}, ${userAddress.state || ''} ${userAddress.pincode || ''}`.trim() :
            userAddress;

          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              type: value,
              address: addressString,
              street: userAddress.street || '',
              city: userAddress.city || '',
              state: userAddress.state || '',
              pincode: userAddress.pincode || '',
              country: userAddress.country || 'India',
              coordinates: userAddress.coordinates || null
            }
          }));
        } else {
          // Clear location data for other types
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              type: value,
              address: '',
              street: '',
              city: '',
              state: '',
              pincode: '',
              country: 'India',
              coordinates: null
            }
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLocationSelect = (location) => {
    const details = location.details || {};

    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        type: 'map',
        address: location.address,
        street: `${details.house_number || ''} ${details.road || ''}`.trim(),
        city: details.city || details.town || details.village || '',
        state: details.state || '',
        pincode: details.postcode || '',
        country: details.country || 'India',
        coordinates: location.coordinates
      }
    }));
    setShowLocationMap(false);
  };



  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';

    // Validate location
    if (!formData.location.address.trim()) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData = {
        type: 'blood',
        name: formData.name,
        phone: formData.phone,
        bloodType: formData.bloodType,
        urgencyLevel: formData.urgencyLevel,
        location: formData.location
      };

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        showSuccess('Success', 'Blood request created successfully!');
        navigate('/volunteer-dashboard');
      } else {
        const errorData = await response.json();
        showError('Error', errorData.message || 'Failed to create blood request');
      }
    } catch (error) {
      console.error('Error creating blood request:', error);
      showError('Error', 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HeartIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create Blood Request</h1>
              <p className="text-red-100">Help save a life by creating a blood donation request</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormInput
                label="Your Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                error={errors.name}
              />

              <FormInput
                label="Contact Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
                error={errors.phone}
              />

              <FormSelect
                label="Blood Type Required"
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                options={bloodTypeOptions}
                placeholder="Select blood type"
                required
                error={errors.bloodType}
              />

              <FormSelect
                label="Urgency Level"
                name="urgencyLevel"
                value={formData.urgencyLevel}
                onChange={handleChange}
                options={urgencyOptions}
                required
                error={errors.urgencyLevel}
              />
            </div>

          </div>

          {/* Location Information */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
              Location Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Location *
              </label>
              <div className="space-y-6">
                {/* Location Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center p-4 border border-white/30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="manual"
                      checked={formData.location.type === 'manual'}
                      onChange={(e) => handleInputChange('location.type', e.target.value)}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Manual Entry</p>
                      <p className="text-gray-300 text-sm">Type address manually</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-white/30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="account"
                      checked={formData.location.type === 'account'}
                      onChange={(e) => handleInputChange('location.type', e.target.value)}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Account Address</p>
                      <p className="text-gray-300 text-sm">Use saved address</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-white/30 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="locationType"
                      value="map"
                      checked={formData.location.type === 'map'}
                      onChange={(e) => handleInputChange('location.type', e.target.value)}
                      className="mr-3 text-blue-500"
                    />
                    <div>
                      <p className="text-white font-medium">Select on Map</p>
                      <p className="text-gray-300 text-sm">Choose from map</p>
                    </div>
                  </label>
                </div>

                {/* Address Input based on selection */}
                {formData.location.type === 'manual' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Street Address"
                        name="street"
                        type="text"
                        value={formData.location.street}
                        onChange={(e) => handleInputChange('location.street', e.target.value)}
                        placeholder="Enter street address"
                        error={errors['location.street']}
                      />
                      <FormInput
                        label="City"
                        name="city"
                        type="text"
                        value={formData.location.city}
                        onChange={(e) => handleInputChange('location.city', e.target.value)}
                        placeholder="Enter city"
                        error={errors['location.city']}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="State"
                        name="state"
                        type="text"
                        value={formData.location.state}
                        onChange={(e) => handleInputChange('location.state', e.target.value)}
                        placeholder="Enter state"
                        error={errors['location.state']}
                      />
                      <FormInput
                        label="Pincode"
                        name="pincode"
                        type="text"
                        value={formData.location.pincode}
                        onChange={(e) => handleInputChange('location.pincode', e.target.value)}
                        placeholder="Enter pincode"
                        error={errors['location.pincode']}
                      />
                      <FormInput
                        label="Country"
                        name="country"
                        type="text"
                        value={formData.location.country}
                        onChange={(e) => handleInputChange('location.country', e.target.value)}
                        placeholder="Enter country"
                        error={errors['location.country']}
                      />
                    </div>
                  </div>
                )}

                {formData.location.type === 'account' && (
                  <div className="bg-white/10 border border-white/30 rounded-lg p-4">
                    <p className="text-white font-medium mb-2">Account Address:</p>
                    <p className="text-gray-300">
                      {user?.address ?
                        (typeof user.address === 'object' ?
                          `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() :
                          user.address
                        ) :
                        'No address found in account'
                      }
                    </p>
                  </div>
                )}

                {formData.location.type === 'map' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLocationMap(true)}
                      className="flex items-center space-x-2 px-4 py-2 border border-white/30 rounded-lg hover:bg-white/20 transition-colors text-white w-full justify-center"
                    >
                      <MapPinIcon className="w-5 h-5 text-gray-300" />
                      <span>
                        {formData.location.address ? 'Change Location' : 'Select Location on Map'}
                      </span>
                    </button>
                    {formData.location.address && (
                      <div className="mt-4 bg-white/10 border border-white/30 rounded-lg p-4">
                        <p className="text-white font-medium mb-2">Selected Location:</p>
                        <p className="text-gray-300">{formData.location.address}</p>
                        {formData.location.coordinates && (
                          <p className="text-xs text-gray-400 mt-1">
                            Coordinates: {formData.location.coordinates.lat.toFixed(6)}, {formData.location.coordinates.lng.toFixed(6)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => navigate('/volunteer-dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-300 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" color="white" />
                  <span>Creating Request...</span>
                </>
              ) : (
                <>
                  <HeartIcon className="w-5 h-5" />
                  <span>Create Blood Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Location Map Modal */}
      {showLocationMap && (
        <SimpleLocationSelector
          isOpen={showLocationMap}
          onClose={() => setShowLocationMap(false)}
          onLocationSelect={handleLocationSelect}
        />
      )}
    </div>
  );
};

export default VolunteerAddBloodRequest;
