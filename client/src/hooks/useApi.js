import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '../utils/alerts';

// Base API function
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || 'Request failed');
  }

  return response.json();
};

// Custom hooks for different API endpoints

// Complaints
export const useComplaints = (filters = {}, page = 1, limit = 12) => {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  queryParams.append('page', page);
  queryParams.append('limit', limit);

  return useQuery({
    queryKey: ['complaints', filters, page, limit],
    queryFn: () => apiCall(`/api/complaints?${queryParams}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Requests
export const useRequests = (filters = {}, page = 1, limit = 10) => {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  queryParams.append('page', page);
  queryParams.append('limit', limit);

  return useQuery({
    queryKey: ['requests', filters, page, limit],
    queryFn: () => apiCall(`/api/requests?${queryParams}`),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Public Blood Requests
export const usePublicBloodRequests = () => {
  return useQuery({
    queryKey: ['publicBloodRequests'],
    queryFn: () => apiCall('/api/requests/public/blood'),
    staleTime: 2 * 60 * 1000, // 2 minutes for more frequent updates
    cacheTime: 5 * 60 * 1000,
  });
};

// Dashboard Data
export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboardData'],
    queryFn: () => apiCall('/api/requests/dashboard'),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Accepted Requests
export const useAcceptedRequests = () => {
  return useQuery({
    queryKey: ['acceptedRequests'],
    queryFn: () => apiCall('/api/requests/accepted'),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Mutations
export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (complaintData) => apiCall('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(complaintData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      showSuccess('Success', 'Complaint submitted successfully');
    },
    onError: (error) => {
      showError('Error', error.message || 'Failed to submit complaint');
    }
  });
};

export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestData) => apiCall('/api/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      showSuccess('Success', 'Request created successfully');
    },
    onError: (error) => {
      showError('Error', error.message || 'Failed to create request');
    }
  });
};

export const useVolunteerForRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (requestId) => apiCall(`/api/requests/${requestId}/volunteer`, {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicBloodRequests'] });
      queryClient.invalidateQueries({ queryKey: ['acceptedRequests'] });
      showSuccess('Success', 'Successfully volunteered to help!');
    },
    onError: (error) => {
      showError('Error', error.message || 'Failed to volunteer');
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profileData) => apiCall('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      showSuccess('Success', 'Profile updated successfully');
    },
    onError: (error) => {
      showError('Error', error.message || 'Failed to update profile');
    }
  });
};

// Utility function to prefetch data
export const usePrefetchComplaints = () => {
  const queryClient = useQueryClient();
  
  return (filters = {}, page = 1, limit = 12) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    queryParams.append('page', page);
    queryParams.append('limit', limit);

    queryClient.prefetchQuery({
      queryKey: ['complaints', filters, page, limit],
      queryFn: () => apiCall(`/api/complaints?${queryParams}`),
      staleTime: 5 * 60 * 1000,
    });
  };
};
