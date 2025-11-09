import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/ui/FormInput';
import FormSelect from '../components/ui/FormSelect';
import AddressInput from '../components/ui/AddressInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { validateSignupForm, hasErrors } from '../utils/validation';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'citizen',
    volunteerKey: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: null
    }
  });
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors and status
    setErrors({});
    setStatusMessage({ type: '', message: '' });

    // Validate form
    const validationErrors = validateSignupForm(formData);

    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      // Don't show SweetAlert for validation errors, just show field errors
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Attempting registration with:', formData.email);
      const result = await register(formData);
      console.log('Registration result:', result);

      if (result && result.success) {
        // Show success message inline
        setStatusMessage({
          type: 'success',
          message: 'Account created successfully! Redirecting to dashboard...'
        });

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        // Show error message inline
        setStatusMessage({
          type: 'error',
          message: result?.message || 'Registration failed. Please check your information and try again.'
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatusMessage({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Clear status message when user starts typing
    if (statusMessage.message) {
      setStatusMessage({ type: '', message: '' });
    }
  };

  const handleAddressChange = (address) => {
    setFormData({
      ...formData,
      address
    });

    // Clear address-related errors
    const newErrors = { ...errors };
    ['street', 'city', 'state', 'pincode'].forEach(field => {
      delete newErrors[field];
    });
    setErrors(newErrors);
  };

  // Role options for the select dropdown
  const roleOptions = [
    { value: 'citizen', label: 'Citizen - Access community services' },
    { value: 'volunteer', label: 'Volunteer - Help others in the community' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <Link
              to="/"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
            <div></div> {/* Spacer for centering */}
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Join Our Community</h1>
          <p className="text-xl text-gray-300">Create your account to access all community services</p>
        </motion.div>

        {/* Main Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-8 lg:p-12">
            {/* Personal Information Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                Personal Information
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormInput
                  label="Full Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  error={errors.name}
                />

                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                  error={errors.email}
                />

                <FormInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your 10-digit phone number"
                  required
                  error={errors.phone}
                />

                <FormSelect
                  label="I want to join as"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={roleOptions}
                  required
                  error={errors.role}
                />
              </div>

              {/* Volunteer Key Field - Only show when volunteer is selected */}
              {formData.role === 'volunteer' && (
                <div className="mt-6">
                  <FormInput
                    label="Volunteer Access Key"
                    name="volunteerKey"
                    type="text"
                    value={formData.volunteerKey}
                    onChange={handleChange}
                    placeholder="Enter your volunteer access key"
                    required
                    error={errors.volunteerKey}
                  />
                  <p className="text-sm text-gray-300 mt-2">
                    Contact your organization administrator to get your volunteer access key.
                  </p>
                </div>
              )}
            </div>

            {/* Security Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                Security
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FormInput
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password (min. 6 characters)"
                  required
                  error={errors.password}
                />

                <FormInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  error={errors.confirmPassword}
                />
              </div>
            </div>



            {/* Address Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                Address Information
              </h2>

              <AddressInput
                address={formData.address}
                onChange={handleAddressChange}
                errors={errors}
              />
            </div>

            {/* General Error Display */}
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <div className="flex items-center space-x-2 text-red-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{errors.general}</span>
                </div>
              </motion.div>
            )}

            {/* Terms and Conditions */}
            <div className="mb-8">
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-500 font-medium underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-500 font-medium underline">
                    Privacy Policy
                  </Link>
                  . I understand that my information will be used to provide community services and may be shared with volunteers for assistance requests.
                </label>
              </div>
            </div>

            {/* Status Message */}
            {statusMessage.message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg text-center font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {statusMessage.type === 'success' && (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{statusMessage.message}</span>
                  </div>
                )}
                {statusMessage.type === 'error' && (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{statusMessage.message}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Link
                to="/login"
                className="text-gray-300 hover:text-purple-400 font-medium transition-colors duration-200"
              >
                Already have an account? <span className="text-purple-400 underline">Sign in here</span>
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="small" color="white" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SignupPage;
