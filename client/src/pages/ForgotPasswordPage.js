import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FormInput from '../components/ui/FormInput';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const navigate = useNavigate();

  // Timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0 && step === 2) {
      setCanResendOtp(true);
    }
    return () => clearInterval(interval);
  }, [otpTimer, step]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsSubmitting(true);
    showLoading('Checking email...');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        closeLoading();

        // Check if email was actually sent
        if (data.emailSent) {
          showSuccess('OTP sent successfully!', 'Please check your email for the verification code.');
        } else {
          showSuccess('OTP Generated!',
            'Email service is temporarily unavailable. ' +
            (data.otp ? `Your OTP is: ${data.otp}` : 'Please check the server console for your OTP.')
          );
        }

        setStep(2);
        setOtpTimer(30); // 30 seconds timer
        setCanResendOtp(false);
      } else {
        closeLoading();
        showError('Email Not Found', data.message || 'This email is not registered with us.');
      }
    } catch (error) {
      closeLoading();
      showError('Network Error', 'Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.otp) {
      setErrors({ otp: 'OTP is required' });
      return;
    }

    if (formData.otp.length !== 6) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return;
    }

    setIsSubmitting(true);
    showLoading('Verifying OTP...');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          otp: formData.otp 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        closeLoading();
        showSuccess('OTP Verified!', 'Please enter your new password.');
        setStep(3);
      } else {
        closeLoading();
        showError('Invalid OTP', data.message || 'The OTP you entered is incorrect.');
      }
    } catch (error) {
      closeLoading();
      showError('Network Error', 'Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.newPassword) {
      setErrors({ newPassword: 'New password is required' });
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setErrors({ newPassword: 'Password must be at least 6 characters long' });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    showLoading('Updating password...');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          otp: formData.otp,
          newPassword: formData.newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        closeLoading();
        showSuccess('Password Reset Successful!', 'Your password has been updated. Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        closeLoading();
        showError('Reset Failed', data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      closeLoading();
      showError('Network Error', 'Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setCanResendOtp(false);
    setOtpTimer(30);
    
    showLoading('Resending OTP...');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        const data = await response.json();
        closeLoading();

        if (data.emailSent) {
          showSuccess('OTP Resent!', 'Please check your email for the new verification code.');
        } else {
          showSuccess('New OTP Generated!',
            'Email service is temporarily unavailable. ' +
            (data.otp ? `Your new OTP is: ${data.otp}` : 'Please check the server console for your new OTP.')
          );
        }
      } else {
        closeLoading();
        showError('Resend Failed', 'Failed to resend OTP. Please try again.');
        setCanResendOtp(true);
        setOtpTimer(0);
      }
    } catch (error) {
      closeLoading();
      showError('Network Error', 'Please check your internet connection and try again.');
      setCanResendOtp(true);
      setOtpTimer(0);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.form
            key="email-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleEmailSubmit}
            className="space-y-6"
          >
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your registered email address"
              error={errors.email}
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Checking...' : 'Send OTP'}
            </button>
          </motion.form>
        );

      case 2:
        return (
          <motion.form
            key="otp-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleOtpSubmit}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <p className="text-gray-300 text-sm">
                We've sent a 6-digit verification code to
              </p>
              <p className="text-white font-semibold">{formData.email}</p>
            </div>

            <FormInput
              label="Verification Code"
              name="otp"
              type="text"
              value={formData.otp}
              onChange={(e) => handleInputChange('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              error={errors.otp}
              maxLength={6}
              required
            />

            <div className="text-center">
              {otpTimer > 0 ? (
                <p className="text-gray-400 text-sm">
                  Resend OTP in {otpTimer} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResendOtp}
                  className="text-blue-400 hover:text-blue-300 text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
          </motion.form>
        );

      case 3:
        return (
          <motion.form
            key="password-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handlePasswordSubmit}
            className="space-y-6"
          >
            <FormInput
              label="New Password"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Enter your new password"
              error={errors.newPassword}
              required
            />

            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your new password"
              error={errors.confirmPassword}
              required
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </motion.form>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Forgot Password';
      case 2:
        return 'Verify Email';
      case 3:
        return 'Reset Password';
      default:
        return 'Forgot Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return 'Enter your email address to receive a verification code';
      case 2:
        return 'Enter the 6-digit code sent to your email';
      case 3:
        return 'Create a new password for your account';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{getStepTitle()}</h2>
            <p className="text-gray-300">{getStepDescription()}</p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {[1, 2, 3].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`w-3 h-3 rounded-full ${
                    stepNumber === step
                      ? 'bg-blue-500'
                      : stepNumber < step
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
