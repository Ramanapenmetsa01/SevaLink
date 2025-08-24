import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import FormInput from '../ui/FormInput';
import { showError, showSuccess, showLoading, closeLoading } from '../../utils/alerts';

const CreateComplaintForm = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    type: 'complaint',
    priority: 'medium',
    urgencyLevel: 5,
    expectedResolutionTime: '',
    location: {
      address: {
        street: '',
        city: '',
        state: '',
        pincode: ''
      }
    },
    contactInfo: {
      phone: '',
      email: '',
      preferredContactMethod: 'app'
    },
    tags: '',
    isPublic: true
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'sanitation', label: 'Sanitation' },
    { value: 'water_supply', label: 'Water Supply' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'road_maintenance', label: 'Road Maintenance' },
    { value: 'waste_management', label: 'Waste Management' },
    { value: 'public_safety', label: 'Public Safety' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'elderly_care', label: 'Elderly Care' },
    { value: 'emergency_assistance', label: 'Emergency Assistance' },
    { value: 'community_service', label: 'Community Service' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child, grandchild] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild ? {
            ...prev[parent][child],
            [grandchild]: value
          } : value
        }
      }));
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    showLoading('Creating complaint...');

    try {
      // Process tags
      const processedData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(processedData)
      });

      const data = await response.json();

      if (response.ok) {
        closeLoading();
        showSuccess('Success!', `${formData.type === 'complaint' ? 'Complaint' : 'Service request'} created successfully`);
        onSuccess();
        onClose();
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          type: 'complaint',
          priority: 'medium',
          urgencyLevel: 5,
          expectedResolutionTime: '',
          location: {
            address: {
              street: '',
              city: '',
              state: '',
              pincode: ''
            }
          },
          contactInfo: {
            phone: '',
            email: '',
            preferredContactMethod: 'app'
          },
          tags: '',
          isPublic: true
        });
      } else {
        closeLoading();
        showError('Error', data.message || 'Failed to create complaint');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while creating complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Complaint</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <FormInput
                label="Title"
                name="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief description of the issue"
                error={errors.title}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the complaint or service request"
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="complaint">Complaint</option>
                <option value="service_request">Service Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Resolution Time
              </label>
              <select
                value={formData.expectedResolutionTime}
                onChange={(e) => handleInputChange('expectedResolutionTime', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select timeframe</option>
                <option value="immediate">Immediate</option>
                <option value="within_24h">Within 24 hours</option>
                <option value="within_week">Within a week</option>
                <option value="within_month">Within a month</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="w-5 h-5 mr-2" />
              Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Street Address"
                name="street"
                type="text"
                value={formData.location.address.street}
                onChange={(e) => handleInputChange('location.address.street', e.target.value)}
                placeholder="Street address"
              />
              <FormInput
                label="City"
                name="city"
                type="text"
                value={formData.location.address.city}
                onChange={(e) => handleInputChange('location.address.city', e.target.value)}
                placeholder="City"
              />
              <FormInput
                label="State"
                name="state"
                type="text"
                value={formData.location.address.state}
                onChange={(e) => handleInputChange('location.address.state', e.target.value)}
                placeholder="State"
              />
              <FormInput
                label="PIN Code"
                name="pincode"
                type="text"
                value={formData.location.address.pincode}
                onChange={(e) => handleInputChange('location.address.pincode', e.target.value)}
                placeholder="PIN Code"
                maxLength={6}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.contactInfo.phone}
                onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                placeholder="Phone number"
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                placeholder="Email address"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={formData.contactInfo.preferredContactMethod}
                  onChange={(e) => handleInputChange('contactInfo.preferredContactMethod', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="app">App Notifications</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Tags (comma-separated)"
                name="tags"
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="urgent, water leak, main road"
              />
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                  Make this complaint public (visible to other users)
                </label>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Complaint'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateComplaintForm;
