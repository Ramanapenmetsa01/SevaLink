// Form validation utilities

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

// Password validation
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return '';
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

// Name validation
export const validateName = (name) => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters long';
  if (name.length > 100) return 'Name cannot exceed 100 characters';
  return '';
};

// Phone validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phone) return 'Phone number is required';
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) return 'Please enter a valid 10-digit phone number';
  return '';
};

// Generic required field validation
export const validateRequired = (value, fieldName) => {
  if (!value || value.toString().trim() === '') {
    return `${fieldName} is required`;
  }
  return '';
};

// Address validation
export const validateAddress = (address) => {
  const errors = {};

  if (!address.street || address.street.trim() === '') {
    errors.street = 'Street address is required';
  }

  if (!address.city || address.city.trim() === '') {
    errors.city = 'City is required';
  }

  if (!address.state || address.state.trim() === '') {
    errors.state = 'State is required';
  }

  if (!address.pincode || address.pincode.trim() === '') {
    errors.pincode = 'PIN code is required';
  } else if (!/^[0-9]{6}$/.test(address.pincode)) {
    errors.pincode = 'PIN code must be 6 digits';
  }

  return errors;
};

// Validate volunteer key
export const validateVolunteerKey = (key, role) => {
  if (role === 'volunteer') {
    if (!key) return 'Volunteer access key is required';
    if (key.length < 8) return 'Volunteer access key must be at least 8 characters';
  }
  return '';
};

// Validate entire signup form
export const validateSignupForm = (formData) => {
  const errors = {};

  // Validate name
  const nameError = validateName(formData.name);
  if (nameError) errors.name = nameError;

  // Validate email
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  // Validate phone
  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.phone = phoneError;

  // Validate password
  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;

  // Validate confirm password
  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  // Validate role
  if (!formData.role) errors.role = 'Please select a role';

  // Validate volunteer key if role is volunteer
  const volunteerKeyError = validateVolunteerKey(formData.volunteerKey, formData.role);
  if (volunteerKeyError) errors.volunteerKey = volunteerKeyError;

  // Validate address
  if (formData.address) {
    const addressErrors = validateAddress(formData.address);
    Object.assign(errors, addressErrors);
  }

  return errors;
};

// Validate login form
export const validateLoginForm = (formData) => {
  const errors = {};

  // Validate email
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  // Validate password
  if (!formData.password) errors.password = 'Password is required';

  return errors;
};

// Check if form has any errors
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

// Get first error message
export const getFirstError = (errors) => {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length > 0) {
    return errors[errorKeys[0]];
  }
  return '';
};
