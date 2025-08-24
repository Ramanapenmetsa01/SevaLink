import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XMarkIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { User } from 'lucide-react';
import { showError, showSuccess } from '../utils/alerts';

const VolunteerAllRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingRequest, setAcceptingRequest] = useState(null); // Track which request is being accepted
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    urgencyLevel: '',
    bloodType: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalRequests: 0,
    limit: 12
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRequests(1);
    }, 300); // Debounce to prevent rapid API calls

    return () => clearTimeout(timeoutId);
  }, [filters.search]); // Only re-fetch when search changes

  useEffect(() => {
    fetchRequests(1);
  }, []); // Initial load

  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);

      // Fetch both requests and complaints in parallel
      const [requestsResponse, complaintsResponse] = await Promise.all([
        // Fetch blood and elder support requests
        fetch(`/api/requests/public?page=${page}&limit=10&status=pending`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        // Fetch open complaints
        fetch(`/api/complaints?status=open&page=${page}&limit=10`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      let allRequests = [];
      let totalCount = 0;

      // Process requests (blood and elder support)
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        const formattedRequests = requestsData.requests.map(req => ({
          ...req,
          type: req.type,
          name: req.requesterName || req.name,
          requesterName: req.requesterName || req.name,
          serviceType: req.serviceType || null,
          dueDate: req.dueDate || null,
          // Ensure location has proper structure
          location: {
            ...req.location,
            address: req.location?.address || `${req.location?.city || ''}, ${req.location?.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location not specified'
          }
        }));
        allRequests = [...allRequests, ...formattedRequests];
        totalCount += requestsData.pagination?.totalRequests || 0;
      }

      // Process complaints
      if (complaintsResponse.ok) {
        const complaintsData = await complaintsResponse.json();
        const formattedComplaints = complaintsData.complaints?.map(complaint => ({
          _id: complaint._id,
          type: 'complaint',
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          priority: complaint.priority,
          urgencyLevel: complaint.priority, // Map priority to urgencyLevel for consistency
          location: {
            address: complaint.location?.address?.street ?
              `${complaint.location.address.street}, ${complaint.location.address.city}, ${complaint.location.address.state}` :
              `${complaint.location?.address?.city || ''}, ${complaint.location?.address?.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location not specified',
            city: complaint.location?.address?.city,
            state: complaint.location?.address?.state,
            ...complaint.location
          },
          status: complaint.status === 'open' ? 'pending' : complaint.status,
          createdAt: complaint.createdAt,
          name: complaint.citizen?.name || 'Citizen',
          requesterName: complaint.citizen?.name || 'Citizen',
          citizen: complaint.citizen,
          // Add phone from contactInfo for complaints
          phone: complaint.contactInfo?.phone || 'Hidden until you volunteer',
          // Include images for complaints
          images: complaint.images || []
        })) || [];
        allRequests = [...allRequests, ...formattedComplaints];
        totalCount += complaintsData.total || 0;
      }

      // Apply search filter if present
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        allRequests = allRequests.filter(req =>
          req.name?.toLowerCase().includes(searchTerm) ||
          req.title?.toLowerCase().includes(searchTerm) ||
          req.description?.toLowerCase().includes(searchTerm) ||
          req.serviceType?.toLowerCase().includes(searchTerm) ||
          req.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by creation date (newest first)
      allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setRequests(allRequests);
      setPagination({
        current: parseInt(page),
        total: Math.ceil(totalCount / 10),
        count: allRequests.length,
        totalRequests: totalCount
      });

    } catch (error) {
      showError('Error', 'Network error while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      setAcceptingRequest(requestId); // Set loading state
      const request = selectedRequest || requests.find(r => r._id === requestId);
      if (!request) {
        showError('Error', 'Request not found');
        return;
      }

      let response;
      let requestData = {};

      // Use different endpoints based on request type
      if (request.type === 'blood') {
        response = await fetch(`/api/requests/${requestId}/volunteer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else if (request.type === 'complaint') {
        // Use the complaints API for volunteer applications
        response = await fetch(`/api/complaints/${requestId}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            message: 'I would like to help with this complaint.',
            estimatedTime: 'Within 24 hours'
          })
        });
      } else if (request.type === 'elder_support') {
        // Elder support now uses the same volunteer endpoint as blood requests
        response = await fetch(`/api/requests/${requestId}/volunteer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      if (response && response.ok) {
        if (request.type === 'complaint') {
          showSuccess('Success', 'Application submitted successfully! You will be notified if selected.');
        } else {
          showSuccess('Success', 'Request accepted successfully!');
        }
        fetchRequests(pagination.current); // Refresh the list
        setShowModal(false);
      } else if (response) {
        const errorData = await response.json();
        showError('Error', errorData.message || 'Failed to accept request');
      }
    } catch (error) {
      showError('Error', 'Network error while accepting request');
    } finally {
      setAcceptingRequest(null); // Clear loading state
    }
  };

  const openRequestModal = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
    setShowModal(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'blood':
        return HeartIcon;
      case 'elder_support':
        return UserGroupIcon;
      case 'complaint':
        return MagnifyingGlassIcon;
      default:
        return HeartIcon;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent':
        return 'bg-red-500/90 text-white border-red-500';
      case 'high':
        return 'bg-orange-500/90 text-white border-orange-500';
      case 'medium':
        return 'bg-yellow-500/90 text-white border-yellow-500';
      case 'low':
        return 'bg-green-500/90 text-white border-green-500';
      default:
        return 'bg-gray-500/90 text-white border-gray-500';
    }
  };

  const getBloodTypeColor = (bloodType) => {
    const colors = {
      'A+': 'bg-red-500/20 text-red-400 border-red-500/30',
      'A-': 'bg-red-600/20 text-red-300 border-red-600/30',
      'B+': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'B-': 'bg-blue-600/20 text-blue-300 border-blue-600/30',
      'AB+': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'AB-': 'bg-purple-600/20 text-purple-300 border-purple-600/30',
      'O+': 'bg-green-500/20 text-green-400 border-green-500/30',
      'O-': 'bg-green-600/20 text-green-300 border-green-600/30'
    };
    return colors[bloodType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const RequestCard = ({ request }) => {
    const Icon = getTypeIcon(request.type);

    // Special layout for blood requests
    if (request.type === 'blood') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.02 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
        >
          {/* Header with urgency and blood type */}
          <div className="flex justify-between items-start mb-4">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getUrgencyColor(request.urgencyLevel)}`}>
              {request.urgencyLevel || 'MEDIUM'}
            </span>
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
              {request.bloodType}
            </div>
          </div>

          {/* Main content */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-white text-lg">{request.patientName || request.requesterName || request.name || 'Patient'}</h3>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-300 mb-2">
            <MapPinIcon className="w-4 h-4 mr-2" />
            <span>{request.location?.city}, {request.location?.state}</span>
          </div>

          {/* Date */}
          <div className="flex items-center text-sm text-gray-300 mb-4">
            <ClockIcon className="w-4 h-4 mr-2" />
            <span>{formatDate(request.createdAt || request.requiredDate)}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => openRequestModal(request)}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium py-2 rounded-lg transition-all duration-300"
          >
            View Details & Help
          </button>
        </motion.div>
      );
    }

    // Special layout for elder support requests
    if (request.type === 'elder_support') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.02 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
        >
          {/* Header with service type */}
          <div className="flex justify-between items-start mb-4">
            <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-green-500/20 text-green-400">
              {request.serviceType || 'GENERAL SUPPORT'}
            </span>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
              ELDER CARE
            </div>
          </div>

          {/* Main content */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-white text-lg">{request.requesterName || request.name || 'Senior Citizen'}</h3>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-300 mb-2">
            <MapPinIcon className="w-4 h-4 mr-2" />
            <span>{request.location?.city}, {request.location?.state}</span>
          </div>

          {/* Due Date */}
          <div className="flex items-center text-sm text-gray-300 mb-2">
            <ClockIcon className="w-4 h-4 mr-2" />
            <span>Due: {request.dueDate ? formatDate(request.dueDate) : 'Not specified'}</span>
          </div>

          {/* Posted Date */}
          <div className="flex items-center text-sm text-gray-300 mb-4">
            <ClockIcon className="w-4 h-4 mr-2" />
            <span>Posted: {formatDate(request.createdAt)}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => openRequestModal(request)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-2 rounded-lg transition-all duration-300"
          >
            View Details & Help
          </button>
        </motion.div>
      );
    }

    // Default layout for other request types
    const getRequestTypeColor = (type) => {
      switch (type) {
        case 'elder_support':
          return 'from-green-500 to-emerald-500';
        case 'complaint':
          return 'from-blue-500 to-purple-500';
        default:
          return 'from-blue-500 to-purple-500';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
      >
        {/* Header with urgency */}
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getUrgencyColor(request.urgencyLevel || request.priority)}`}>
            {(request.urgencyLevel || request.priority || 'MEDIUM').toUpperCase()}
          </span>
        </div>

        {/* Main content */}
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 bg-gradient-to-r ${getRequestTypeColor(request.type)} rounded-lg flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">{request.requesterName || request.name || 'Citizen'}</h3>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-300 mb-2">
          <MapPinIcon className="w-4 h-4 mr-2" />
          <span>{request.location?.city}, {request.location?.state}</span>
        </div>

        {/* Issue/Date */}
        <div className="flex items-center text-sm text-gray-300 mb-4">
          <ClockIcon className="w-4 h-4 mr-2" />
          <span>{formatDate(request.createdAt)}</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => openRequestModal(request)}
          className={`w-full bg-gradient-to-r ${getRequestTypeColor(request.type)} hover:opacity-90 text-white font-medium py-2 rounded-lg transition-all duration-300`}
        >
          View Details & Help
        </button>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-4">
          {filters.type === 'blood' ? 'Blood Donation Requests' : 'Available Requests'}
        </h1>
        <p className="text-gray-300 text-lg">
          {filters.type === 'blood'
            ? 'Help save lives by donating blood to those in need'
            : 'Help your community by accepting requests that match your skills'
          }
        </p>
      </motion.div>

      {/* Search only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
      >
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Results Count */}
      <div className="text-gray-300">
        Showing {pagination.count} of {pagination.totalRequests} requests
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {requests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <HeartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No requests found</h3>
          <p className="text-gray-400">Try adjusting your filters or check back later for new requests.</p>
        </motion.div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="flex justify-center space-x-2">
          {[...Array(pagination.total)].map((_, index) => (
            <button
              key={index}
              onClick={() => fetchRequests(index + 1)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                pagination.current === index + 1
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      <AnimatePresence>
        {showModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeRequestModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedRequest.type === 'blood' && 'Blood Donation Request'}
                    {selectedRequest.type === 'elder_support' && 'Elder Support Request'}
                    {selectedRequest.type === 'complaint' && selectedRequest.title}
                  </h2>
                </div>
                <button
                  onClick={closeRequestModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Request Details */}
              <div className="space-y-6">
                {/* Blood Request Details */}
                {selectedRequest.type === 'blood' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Request Information */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Request Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Blood Type:</span>
                            <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${getBloodTypeColor(selectedRequest.bloodType)}`}>
                              {selectedRequest.bloodType}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Urgency:</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${getUrgencyColor(selectedRequest.urgencyLevel)}`}>
                              {selectedRequest.urgencyLevel || 'MEDIUM'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Requested by:</span>
                            <span className="text-white font-medium">{selectedRequest.requesterName || selectedRequest.name || 'Citizen'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Date:</span>
                            <span className="text-white">{formatDate(selectedRequest.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-white mb-2">Location:</h4>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <p className="text-gray-300 text-sm">
                            {selectedRequest.location?.city && selectedRequest.location?.state
                              ? `${selectedRequest.location.address ? selectedRequest.location.address + ', ' : ''}${selectedRequest.location.city}, ${selectedRequest.location.state}${selectedRequest.location.pincode ? ' - ' + selectedRequest.location.pincode : ''}`
                              : 'Location will be shared after volunteering'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-md font-semibold text-white mb-2">Contact:</h4>
                        <div className="bg-gray-800/50 rounded-lg p-3 flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-300 text-sm">Phone number hidden until you volunteer</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - How You Can Help */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">How You Can Help</h3>

                        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-4">
                          <div className="flex items-start space-x-2">
                            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <h4 className="text-red-400 font-semibold text-sm mb-1">Important Information</h4>
                              <p className="text-gray-300 text-sm">
                                By volunteering, you agree to contact the requester and coordinate the blood donation process. Please ensure you are eligible to donate blood.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-md font-semibold text-white mb-3">Donation Requirements:</h4>
                          <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              <span>Age: 18-65 years</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              <span>Weight: Minimum 50kg</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              <span>Good health condition</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              <span>No recent illness or medication</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Elder Support Request Details */}
                {selectedRequest.type === 'elder_support' && (
                  <>
                    {/* Service Type and Urgency */}
                    <div className="flex flex-wrap gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getUrgencyColor(selectedRequest.urgencyLevel)}`}>
                        {selectedRequest.urgencyLevel?.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    {/* Service Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Service Details</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <p className="text-gray-300">
                          <span className="font-medium">Service Type:</span> {selectedRequest.serviceType || 'Not specified'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-medium">Due Date:</span> {selectedRequest.dueDate ? formatDate(selectedRequest.dueDate) : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex items-center">
                          <User className="w-5 h-5 mr-3 text-gray-400" />
                          <span className="text-gray-300">
                            <span className="font-medium">Name:</span> {selectedRequest.requesterName || selectedRequest.name || 'Not specified'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-300">
                            <span className="font-medium">Phone:</span> Hidden until you volunteer
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Complaint Request Details */}
                {selectedRequest.type === 'complaint' && (
                  <>
                    {/* Priority */}
                    <div className="flex flex-wrap gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getUrgencyColor(selectedRequest.priority)}`}>
                        {selectedRequest.priority?.toUpperCase()} PRIORITY
                      </span>
                    </div>

                    {/* Complaint Details */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Complaint Details</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <p className="text-gray-300">
                          <span className="font-medium">Issue:</span> {selectedRequest.title}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-medium">Description:</span> {selectedRequest.description}
                        </p>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                      <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex items-center">
                          <User className="w-5 h-5 mr-3 text-gray-400" />
                          <span className="text-gray-300">
                            <span className="font-medium">Name:</span> {selectedRequest.requesterName || selectedRequest.name || 'Not specified'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-300">
                            <span className="font-medium">Phone:</span> {selectedRequest.phone || 'Hidden until you volunteer'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Common Location Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Location</h3>
                  <div className="flex items-center text-gray-300">
                    <MapPinIcon className="w-5 h-5 mr-2" />
                    <span>
                      {selectedRequest.location?.address ||
                       `${selectedRequest.location?.city || ''}, ${selectedRequest.location?.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') ||
                       'Location not specified'}
                      {selectedRequest.location?.pincode && ` - ${selectedRequest.location.pincode}`}
                    </span>
                  </div>
                </div>

                {/* Due Date (if applicable) */}
                {selectedRequest.dueDate && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Due Date</h3>
                    <div className="flex items-center text-gray-300">
                      <ClockIcon className="w-5 h-5 mr-2" />
                      <span>{formatDate(selectedRequest.dueDate)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-8 pt-6 border-t border-white/20">
                {selectedRequest.type === 'blood' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleAcceptRequest(selectedRequest._id)}
                      disabled={acceptingRequest === selectedRequest._id}
                      className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      {acceptingRequest === selectedRequest._id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Accepting...</span>
                        </>
                      ) : (
                        <span>I Want to Help - Contact Requester</span>
                      )}
                    </button>
                    <p className="text-center text-gray-400 text-xs">
                      Your contact information will be shared with the requester
                    </p>
                  </div>
                )}
                {selectedRequest.type !== 'blood' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleAcceptRequest(selectedRequest._id)}
                      disabled={acceptingRequest === selectedRequest._id}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      {acceptingRequest === selectedRequest._id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{selectedRequest.type === 'complaint' ? 'Applying...' : 'Accepting...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-5 h-5" />
                          <span>
                            {selectedRequest.type === 'complaint'
                              ? 'Apply to Help'
                              : 'I Want to Help - Contact Requester'
                            }
                          </span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-gray-400 text-xs">
                      {selectedRequest.type === 'complaint'
                        ? 'You will be notified if your application is accepted'
                        : 'Your contact information will be shared with the requester'
                      }
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolunteerAllRequests;
