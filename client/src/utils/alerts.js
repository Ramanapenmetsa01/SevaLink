import Swal from 'sweetalert2';

// Custom SweetAlert configurations
const alertConfig = {
  success: {
    icon: 'success',
    confirmButtonColor: '#22c55e',
    background: '#ffffff',
    color: '#1f2937',
    showConfirmButton: true,
    timer: 3000,
    timerProgressBar: true,
  },
  error: {
    icon: 'error',
    confirmButtonColor: '#ef4444',
    background: '#ffffff',
    color: '#1f2937',
    showConfirmButton: true,
  },
  warning: {
    icon: 'warning',
    confirmButtonColor: '#f59e0b',
    background: '#ffffff',
    color: '#1f2937',
    showConfirmButton: true,
  },
  info: {
    icon: 'info',
    confirmButtonColor: '#3b82f6',
    background: '#ffffff',
    color: '#1f2937',
    showConfirmButton: true,
  },
  question: {
    icon: 'question',
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6b7280',
    background: '#ffffff',
    color: '#1f2937',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
  }
};

// Success alert
export const showSuccess = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    ...alertConfig.success,
  });
};

// Error alert
export const showError = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    ...alertConfig.error,
  });
};

// Warning alert
export const showWarning = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    ...alertConfig.warning,
  });
};

// Info alert
export const showInfo = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    ...alertConfig.info,
  });
};

// Confirmation dialog
export const showConfirmation = (title, text = '', confirmText = 'Yes', cancelText = 'No') => {
  return Swal.fire({
    title,
    text,
    ...alertConfig.question,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });
};

// Loading alert
export const showLoading = (title = 'Please wait...', text = '') => {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// Close loading
export const closeLoading = () => {
  Swal.close();
};

// Toast notifications (smaller, non-intrusive)
export const showToast = (icon, title, position = 'top-end') => {
  const Toast = Swal.mixin({
    toast: true,
    position,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  return Toast.fire({
    icon,
    title,
  });
};

// Specific toast methods
export const toastSuccess = (title) => showToast('success', title);
export const toastError = (title) => showToast('error', title);
export const toastWarning = (title) => showToast('warning', title);
export const toastInfo = (title) => showToast('info', title);
