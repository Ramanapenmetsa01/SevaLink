import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  FunnelIcon,
  HeartIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';
import Pagination from '../components/ui/Pagination';

const AllRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [accepters, setAccepters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [loadingAccepters, setLoadingAccepters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sortBy: 'newest'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalRequests: 0,
    limit: 10
  });



  useEffect(() => {
    fetchRequests(1);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = async (page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      queryParams.append('page', page);
      queryParams.append('limit', pagination.limit);

      const response = await fetch(`/api/requests?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        setPagination(data.pagination);
      } else {
        showError('Error', 'Failed to fetch requests');
        setRequests([]);
      }
    } catch (error) {
      showError('Error', 'Network error while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    fetchRequests(page);
    setPagination(prev => ({ ...prev, current: page }));
  };

  const getTypeIcon = (type) => {
    const icons = {
      blood: HeartIcon,
      elder_support: UserGroupIcon,
      complaint: ExclamationTriangleIcon
    };
    return icons[type] || ClockIcon;
  };

  const getTypeColor = (type) => {
    const colors = {
      blood: 'bg-red-100 text-red-600',
      elder_support: 'bg-green-100 text-green-600',
      complaint: 'bg-orange-100 text-orange-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-400',
      accepted: 'text-green-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[urgency] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchContactDetails = async (requestId) => {
    try {
      setLoadingAccepters(true);
      const response = await fetch(`/api/requests/${requestId}/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Set the contact details in accepters format for compatibility
        if (data.request.donor) {
          setAccepters([{
            _id: 'contact-details',
            user: data.request.donor,
            acceptedAt: data.request.acceptedAt,
            status: 'accepted'
          }]);
        } else {
          setAccepters([]);
        }
      } else {
        // Fallback to old accepters endpoint for non-accepted requests
        const fallbackResponse = await fetch(`/api/requests/${requestId}/accepters`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setAccepters(fallbackData.accepters || []);
        } else {
          setAccepters([]);
        }
      }
    } catch (error) {
      showError('Error', 'Network error while fetching contact details');
      setAccepters([]);
    } finally {
      setLoadingAccepters(false);
    }
  };

  const openRequestModal = async (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    await fetchContactDetails(request._id);
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
    setShowModal(false);
    setAccepters([]);
  };

  const openDeleteModal = (request) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setRequestToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      showLoading('Deleting request...');

      const response = await fetch(`/api/requests/${requestToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setRequests(prev => prev.filter(req => req._id !== requestToDelete._id));
        closeLoading();
        showSuccess('Success', 'Request deleted successfully');
        closeDeleteModal();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to delete request');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while deleting request');
    }
  };

  const RequestCard = ({ request }) => {
    const Icon = getTypeIcon(request.type);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 hover:bg-white/20 transition-colors duration-200 p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-3 rounded-lg ${getTypeColor(request.type)}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">{request.title}</h3>
              <p className="text-gray-300 text-sm line-clamp-2 mb-3">{request.description}</p>

              {/* Type-specific details */}
              <div className="space-y-1 text-sm text-gray-400">
                {request.type === 'blood' && (
                  <>
                    <p>Blood Type: <span className="font-medium text-red-400">{request.bloodType}</span></p>
                    <p>Urgency: <span className={`font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                      {request.urgencyLevel?.toUpperCase() || 'MEDIUM'}
                    </span></p>
                    <p>Donors: <span className="font-medium text-green-400">
                      {request.accepters?.length || 0} volunteers
                    </span></p>
                  </>
                )}
                {request.type === 'elder_support' && (
                  <>
                    <p>Service: <span className="font-medium">{request.serviceType}</span></p>
                    <p>Due: <span className="font-medium">{formatDate(request.dueDate)}</span></p>
                  </>
                )}
                {request.type === 'complaint' && (
                  <p>Category: <span className="font-medium">{request.category}</span></p>
                )}
                <p>Location: <span className="font-medium">
                  {typeof request.location === 'object' ? request.location.address : request.location}
                </span></p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {request.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="text-sm text-gray-400">
            <p>Created: {formatDate(request.createdAt)}</p>
            {request.updatedAt !== request.createdAt && (
              <p>Updated: {formatDate(request.updatedAt)}</p>
            )}
          </div>

          <div className="flex space-x-2">
            {request.type === 'blood' && (
              <button
                onClick={() => openRequestModal(request)}
                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                title="View Donors"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}
            {request.status === 'pending' && (
              <button
                onClick={() => {/* Edit request */}}
                className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                title="Edit Request"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => openDeleteModal(request)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Delete Request"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              My Requests
            </h1>
            <p className="text-gray-300">Track and manage all your requests</p>
          </div>

          <button
            onClick={() => navigate('/dashboard/add-request')}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Request</span>
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-300" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="" className="text-gray-900">All Types</option>
              <option value="blood" className="text-gray-900">Blood Request</option>
              <option value="elder_support" className="text-gray-900">Elder Support</option>
              <option value="complaint" className="text-gray-900">Complaint</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="" className="text-gray-900">All Status</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="in_progress" className="text-gray-900">In Progress</option>
              <option value="resolved" className="text-gray-900">Resolved</option>
              <option value="completed" className="text-gray-900">Completed</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
              className="bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest" className="text-gray-900">Newest First</option>
              <option value="oldest" className="text-gray-900">Oldest First</option>
              <option value="updated" className="text-gray-900">Recently Updated</option>
            </select>

            <button
              onClick={() => setFilters({ type: '', status: '', sortBy: 'newest' })}
              className="px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>

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
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <AnimatePresence>
            {requests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

        {!loading && requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No requests found</h3>
            <p className="text-gray-300 mb-6">
              {Object.values(filters).some(f => f)
                ? "No requests match your current filters."
                : "You haven't created any requests yet."
              }
            </p>
            <button
              onClick={() => navigate('/dashboard/add-request')}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Create Your First Request
            </button>
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && requests.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Pagination
              currentPage={pagination.current}
              totalPages={pagination.total}
              totalItems={pagination.totalRequests}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
            />
          </motion.div>
        )}

      {/* Donors Modal */}
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
              className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-2xl font-bold text-white">Blood Request Donors</h2>
                <button
                  onClick={closeRequestModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-300" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Request Summary */}
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Request Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Blood Type:</span>
                      <p className="text-red-400 font-medium">{selectedRequest.bloodType}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Urgency:</span>
                      <p className={`font-medium ${getUrgencyColor(selectedRequest.urgencyLevel)}`}>
                        {selectedRequest.urgencyLevel?.toUpperCase() || 'MEDIUM'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <p className={`font-medium ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <p className="text-white">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Donors List */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {selectedRequest.status === 'accepted' ? 'Donor Contact Details' : `Volunteer Donors (${accepters.length})`}
                  </h3>

                  {loadingAccepters ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : accepters.length === 0 ? (
                    <div className="text-center py-8">
                      <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-300">
                        {selectedRequest.status === 'accepted'
                          ? 'Contact details not available'
                          : 'No donors have volunteered yet'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {selectedRequest.status === 'accepted'
                          ? 'Unable to load donor contact information'
                          : 'Share your request to find donors'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {accepters.map((accepter) => (
                        <div
                          key={accepter._id}
                          className="bg-white/10 rounded-lg p-4 border border-white/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-green-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-medium">{accepter.user.name}</h4>
                                <p className="text-gray-400 text-sm">{accepter.user.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-sm">Volunteered</p>
                              <p className="text-white text-sm">{formatDate(accepter.acceptedAt)}</p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <PhoneIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-white">{accepter.user.phone}</span>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                accepter.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                accepter.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                accepter.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {accepter.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && requestToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeDeleteModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
                <button
                  onClick={closeDeleteModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Delete Request</h3>
                    <p className="text-gray-300 text-sm">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <p className="text-gray-300 text-sm mb-2">You are about to delete:</p>
                  <p className="text-white font-medium">
                    {requestToDelete.type === 'blood' && `${requestToDelete.bloodType} Blood Request`}
                    {requestToDelete.type === 'elder_support' && `${requestToDelete.serviceType} Service`}
                    {requestToDelete.type === 'complaint' && `${requestToDelete.category} Complaint`}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Created: {formatDate(requestToDelete.createdAt)}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={closeDeleteModal}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteRequest}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllRequestsPage;
