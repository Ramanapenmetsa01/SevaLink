import React, { useState } from 'react';
import { ChevronDownIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  error = '',
  disabled = false,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = error && error.length > 0;

  const selectClasses = `
    w-full px-4 py-3 border rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    appearance-none bg-white/10 cursor-pointer text-white
    [&>option]:bg-gray-800 [&>option]:text-white [&>option]:py-2
    [&>option:checked]:bg-purple-600 [&>option:hover]:bg-purple-500
    ${hasError
      ? 'border-red-400 focus:ring-red-500 bg-red-900/20'
      : isFocused
        ? 'border-purple-400 focus:ring-purple-500'
        : 'border-white/30 focus:ring-purple-500 hover:border-white/50'
    }
    ${disabled ? 'bg-gray-800/50 cursor-not-allowed' : ''}
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

      {/* Select Container */}
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          disabled={disabled}
          className={selectClasses}
          style={{
            colorScheme: 'dark'
          }}
          {...props}
        >
          <option
            value=""
            disabled
            style={{
              backgroundColor: '#374151',
              color: '#9CA3AF'
            }}
          >
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{
                backgroundColor: '#374151',
                color: '#FFFFFF',
                padding: '8px'
              }}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown Arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {hasError ? (
            <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center space-x-2 text-red-600 text-sm"
          >
            <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormSelect;
