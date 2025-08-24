import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const FormInput = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error = '',
  disabled = false,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const hasError = error && error.length > 0;

  const inputClasses = `
    w-full px-4 py-3 border rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent text-white placeholder-gray-400
    ${hasError
      ? 'border-red-400 focus:ring-red-500 bg-red-900/20'
      : isFocused
        ? 'border-purple-400 focus:ring-purple-500 bg-white/10'
        : 'border-white/30 focus:ring-purple-500 bg-white/10 hover:border-white/50'
    }
    ${disabled ? 'bg-gray-800/50 cursor-not-allowed' : ''}
    ${isPassword ? 'pr-12' : ''}
    ${className}
  `;

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-white">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />

        {/* Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Error Icon */}
        {hasError && !isPassword && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-2 text-red-400 text-sm"
          >
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormInput;
