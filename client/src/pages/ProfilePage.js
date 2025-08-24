import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/ui/FormInput';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: typeof user?.address === 'object' ?
      `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() :
      user?.address || ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSave = async () => {
    try {
      showLoading('Updating profile...');

      // Parse address string into object format expected by backend
      const addressParts = formData.address.split(',').map(part => part.trim());
      let addressObj = {};

      if (addressParts.length >= 1) {
        addressObj.street = addressParts[0] || '';
      }
      if (addressParts.length >= 2) {
        addressObj.city = addressParts[1] || '';
      }
      if (addressParts.length >= 3) {
        // Extract state and pincode from the last part
        const lastPart = addressParts[addressParts.length - 1];
        const pincodeMatch = lastPart.match(/(\d{6})$/);
        if (pincodeMatch) {
          addressObj.pincode = pincodeMatch[1];
          addressObj.state = lastPart.replace(pincodeMatch[1], '').trim();
        } else {
          addressObj.state = lastPart;
        }
      }

      const updateData = {
        ...formData,
        address: addressObj
      };

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        closeLoading();
        showSuccess('Success', 'Profile updated successfully');
        setIsEditing(false);

        // Update user context with new data
        if (updateUser) {
          updateUser(data.user);
        }
      } else {
        const errorData = await response.json();
        closeLoading();
        showError('Error', errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while updating profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: typeof user?.address === 'object' ?
        `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() :
        user?.address || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Profile</h1>
            <p className="text-gray-300">Manage your account information</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
            >
              <PencilIcon className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8"
        >
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
            <p className="text-blue-400 capitalize">{user?.role}</p>
            <p className="text-sm text-gray-300">Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Full Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                error={errors.name}
                icon={UserIcon}
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                error={errors.email}
                icon={EnvelopeIcon}
              />

              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                error={errors.phone}
                icon={PhoneIcon}
              />

              <FormInput
                label="Address"
                name="address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter your address"
                error={errors.address}
                icon={MapPinIcon}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-white/30 text-gray-300 rounded-lg hover:bg-white/10 hover:border-white/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg border border-white/20">
              <UserIcon className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-300">Full Name</p>
                <p className="font-medium text-white">{user?.name || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg border border-white/20">
              <EnvelopeIcon className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-300">Email Address</p>
                <p className="font-medium text-white">{user?.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg border border-white/20">
              <PhoneIcon className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-300">Phone Number</p>
                <p className="font-medium text-white">{user?.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-white/10 rounded-lg border border-white/20">
              <MapPinIcon className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-sm text-gray-300">Address</p>
                <p className="font-medium text-white">
                  {typeof user?.address === 'object' ?
                    `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.pincode || ''}`.trim() || 'Not provided' :
                    user?.address || 'Not provided'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>


    </div>
  );
};

export default ProfilePage;
