import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhotoIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import FormInput from '../components/ui/FormInput';
import SimpleLocationSelector from '../components/ui/SimpleLocationSelector';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext';

const AddRequestPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'blood');
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    phone: '',
    location: {
      type: 'manual', // 'manual', 'account', or 'map'
      address: '',
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      coordinates: null
    },

    // Blood request specific
    bloodType: '',
    urgencyLevel: 'medium',

    // Elder support specific
    dueDate: '',
    serviceType: '',

    // Complaint specific
    title: '',
    description: '',
    category: '',
    images: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Auto-populate user data when component loads
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  // Cleanup image URLs on component unmount
  useEffect(() => {
    return () => {
      formData.images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [formData.images]);

  const requestTypes = [
    {
      id: 'blood',
      name: 'Blood Request',
      icon: HeartIcon,
      color: 'bg-red-500',
      description: 'Request blood donation'
    },
    {
      id: 'elder_support',
      name: 'Elder Support',
      icon: UserGroupIcon,
      color: 'bg-green-500',
      description: 'Request elderly care services'
    },
    {
      id: 'complaint',
      name: 'Complaint',
      icon: ExclamationTriangleIcon,
      color: 'bg-orange-500',
      description: 'Report community issues'
    }
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const complaintCategories = [
    'Infrastructure',
    'Sanitation',
    'Water Supply',
    'Electricity',
    'Road Maintenance',
    'Waste Management',
    'Public Safety',
    'Healthcare',
    'Education',
    'Transportation',
    'Other'
  ];

  const elderServiceTypes = [
    'Medicine Delivery',
    'Grocery Shopping',
    'Medical Appointment',
    'Household Help',
    'Companionship',
    'Emergency Assistance',
    'Other'
  ];

  useEffect(() => {
    // Reset form when type changes
    setFormData(prev => ({
      name: prev.name,
      location: prev.location,
      bloodType: '',
      urgencyLevel: 'medium',
      dueDate: '',
      serviceType: '',
      title: '',
      description: '',
      category: '',
      images: []
    }));
    setErrors({});
  }, [selectedType]);

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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Create image objects with preview URLs
    const imageObjects = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageObjects]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      // Revoke the object URL to free memory
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Phone validation - use account phone for all request types
    if (!user?.phone) {
      newErrors.phone = 'Phone number is required. Please update your profile with a phone number.';
    }

    // Location validation
    if (formData.location.type === 'manual') {
      if (!formData.location.street || !formData.location.street.trim()) {
        newErrors['location.street'] = 'Street address is required';
      }
      if (!formData.location.city || !formData.location.city.trim()) {
        newErrors['location.city'] = 'City is required';
      }
      if (!formData.location.state || !formData.location.state.trim()) {
        newErrors['location.state'] = 'State is required';
      }
      if (!formData.location.pincode || !formData.location.pincode.trim()) {
        newErrors['location.pincode'] = 'Pincode is required';
      }
    } else if (formData.location.type === 'account') {
      if (!user?.address) {
        newErrors['location.address'] = 'No address found in account. Please update your profile or use manual entry.';
      }
    } else if (formData.location.type === 'map') {
      if (!formData.location.address || !formData.location.address.trim()) {
        newErrors['location.address'] = 'Please select a location on the map';
      }
    }

    // Type-specific validations
    if (selectedType === 'blood') {
      if (!formData.bloodType) {
        newErrors.bloodType = 'Blood type is required';
      }
    }

    if (selectedType === 'elder_support') {
      if (!formData.serviceType) {
        newErrors.serviceType = 'Service type is required';
      }
      if (!formData.dueDate) {
        newErrors.dueDate = 'Due date is required';
      }
    }

    if (selectedType === 'complaint') {
      if (!formData.title || !formData.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (formData.title.trim().length < 5) {
        newErrors.title = 'Title must be at least 5 characters';
      } else if (formData.title.trim().length > 200) {
        newErrors.title = 'Title must be less than 200 characters';
      }

      if (!formData.description || !formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      } else if (formData.description.trim().length > 2000) {
        newErrors.description = 'Description must be less than 2000 characters';
      }

      if (!formData.category) {
        newErrors.category = 'Category is required';
      }
    }

    setErrors(newErrors);

    // Debug: Log validation errors
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    showLoading('Creating request...');

    try {
      // Prepare request data based on type
      const phoneNumber = user?.phone;

      // Ensure we have a valid phone number
      if (!phoneNumber) {
        showError('Phone number is required. Please update your profile with a phone number.');
        setIsSubmitting(false);
        closeLoading();
        return;
      }

      let requestData = {
        type: selectedType,
        name: formData.name,
        phone: phoneNumber,
        location: {
          type: formData.location.type,
          address: formData.location.address,
          street: formData.location.street,
          city: formData.location.city,
          state: formData.location.state,
          pincode: formData.location.pincode,
          country: formData.location.country,
          coordinates: formData.location.coordinates
        }
      };

      if (selectedType === 'blood') {
        requestData = {
          ...requestData,
          bloodType: formData.bloodType,
          urgencyLevel: formData.urgencyLevel
        };
      } else if (selectedType === 'elder_support') {
        requestData = {
          ...requestData,
          serviceType: formData.serviceType,
          dueDate: formData.dueDate
        };
      } else if (selectedType === 'complaint') {
        requestData = {
          ...requestData,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          images: formData.images.map(img => ({
            name: img.name,
            size: img.size
          }))
        };
      }

      // Submit to API
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific phone-related errors
        if (data.error === 'PHONE_REQUIRED') {
          closeLoading();
          showError('Phone Number Required', data.message);
          setIsSubmitting(false);
          return;
        }
        throw new Error(data.message || 'Failed to create request');
      }

      closeLoading();
      showSuccess('Success!', `${selectedType.replace('_', ' ')} request created successfully`);

      // Clear all form inputs
      setFormData({
        name: user?.name || '',
        phone: user?.phone || '',
        location: {
          type: 'manual',
          address: '',
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          coordinates: null
        },
        bloodType: '',
        urgencyLevel: 'medium',
        dueDate: '',
        serviceType: '',
        title: '',
        description: '',
        category: '',
        images: []
      });

      // Clear any errors
      setErrors({});

    } catch (error) {
      closeLoading();
      showError('Error', error.message || 'Failed to create request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
      {requestTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-105
              ${isSelected
                ? 'border-blue-400 bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-lg shadow-blue-500/25'
                : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20'
              }
            `}
          >
            <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center mb-4 shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{type.name}</h3>
            <p className="text-gray-300 text-sm">{type.description}</p>
          </button>
        );
      })}
    </div>
  );

  const renderCommonFields = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FormInput
          label="Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter your name"
          error={errors.name}
          required
        />

        {/* Show phone info for all request types */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Contact Phone
          </label>
          <div className={`border rounded-lg px-3 py-2 ${
            user?.phone
              ? 'bg-white/10 border-white/30 text-gray-300'
              : 'bg-red-500/20 border-red-400 text-red-300'
          }`}>
            {user?.phone || 'No phone number in account - Please update your profile'}
          </div>
          <p className="text-xs mt-1">
            {user?.phone
              ? <span className="text-gray-400">Phone number from your account profile</span>
              : (
                <span>
                  <span className="text-red-400">Go to </span>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/profile')}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Profile page
                  </button>
                  <span className="text-red-400"> to add your phone number</span>
                </span>
              )
            }
          </p>
        </div>
      </div>

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
  );

  const renderBloodRequestFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Blood Type Required *
        </label>
        <select
          value={formData.bloodType}
          onChange={(e) => handleInputChange('bloodType', e.target.value)}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="" className="text-gray-900">Select Blood Type</option>
          {bloodTypes.map(type => (
            <option key={type} value={type} className="text-gray-900">{type}</option>
          ))}
        </select>
        {errors.bloodType && (
          <p className="text-red-400 text-sm mt-1">{errors.bloodType}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Urgency Level
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {urgencyLevels.map(level => (
            <button
              key={level.value}
              type="button"
              onClick={() => handleInputChange('urgencyLevel', level.value)}
              className={`
                p-3 rounded-lg border-2 transition-all duration-200 text-center
                ${formData.urgencyLevel === level.value
                  ? 'border-blue-400 bg-blue-500/20 shadow-lg'
                  : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/20'
                }
              `}
            >
              <span className={`font-medium ${level.color}`}>{level.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderElderSupportFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Service Type *
        </label>
        <select
          value={formData.serviceType}
          onChange={(e) => handleInputChange('serviceType', e.target.value)}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" className="bg-gray-800 text-white">Select Service Type</option>
          {elderServiceTypes.map(type => (
            <option key={type} value={type} className="bg-gray-800 text-white">{type}</option>
          ))}
        </select>
        {errors.serviceType && (
          <p className="text-red-400 text-sm mt-1">{errors.serviceType}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Due Date *
        </label>
        <div className="relative">
          <input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(e) => handleInputChange('dueDate', e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <CalendarIcon className="absolute right-3 top-2.5 w-5 h-5 text-gray-300 pointer-events-none" />
        </div>
        {errors.dueDate && (
          <p className="text-red-400 text-sm mt-1">{errors.dueDate}</p>
        )}
      </div>
    </div>
  );

  const renderComplaintFields = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Title * <span className="text-gray-400 text-xs">({formData.title.length}/200)</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Brief description of the issue (5-200 characters)"
          maxLength={200}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.title && (
          <p className="text-red-400 text-sm mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Description * <span className="text-gray-400 text-xs">({formData.description.length}/2000)</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Detailed description of the complaint (10-2000 characters)"
          rows={4}
          maxLength={2000}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Category *
        </label>
        <select
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" className="bg-gray-800 text-white">Select Category</option>
          {complaintCategories.map(category => (
            <option key={category} value={category} className="bg-gray-800 text-white">{category}</option>
          ))}
        </select>
        {errors.category && (
          <p className="text-red-400 text-sm mt-1">{errors.category}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Images (Optional)
        </label>
        <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center">
          <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">Upload images to support your complaint</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Choose Images
          </label>
        </div>
        {formData.images.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-3">Selected images ({formData.images.length}):</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.images.map((imageObj, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-white/10 rounded-lg overflow-hidden border border-white/20">
                    <img
                      src={imageObj.preview}
                      alt={imageObj.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                  <p className="text-xs text-gray-300 mt-1 truncate" title={imageObj.name}>
                    {imageObj.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(imageObj.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Add New Request
        </h1>
        <p className="text-gray-300">Choose the type of request and fill in the details</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Request Type Selector */}
          {renderTypeSelector()}

          {/* Common Fields */}
          {renderCommonFields()}

          {/* Type-specific Fields */}
          {selectedType === 'blood' && renderBloodRequestFields()}
          {selectedType === 'elder_support' && renderElderSupportFields()}
          {selectedType === 'complaint' && renderComplaintFields()}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? 'Creating...' : 'Create Request'}
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

export default AddRequestPage;
