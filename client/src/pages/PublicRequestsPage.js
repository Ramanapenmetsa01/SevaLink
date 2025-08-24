import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  UserIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';

const PublicRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [acceptedRequests, setAcceptedRequests] = useState(new Set());

  useEffect(() => {
    fetchPublicRequests();
    fetchAcceptedRequests();
  }, []);

  const fetchAcceptedRequests = async () => {
    try {
      const response = await fetch('/api/requests/accepted', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const acceptedIds = new Set(data.requests.map(req => req._id));
        setAcceptedRequests(acceptedIds);
      }
    } catch (error) {
      console.error('Error fetching accepted requests:', error);
    }
  };

  const fetchPublicRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/public/blood', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        showError('Error', 'Failed to fetch blood requests');
        setRequests([]);
      }
    } catch (error) {
      showError('Error', 'Network error while fetching requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVolunteer = async (requestId) => {
    try {
      showLoading('Volunteering to help...');
      
      const response = await fetch(`/api/requests/${requestId}/volunteer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        closeLoading();
        showSuccess('Success!', 'Thank you for volunteering! You can now see contact details.');
        setShowModal(false);
        setAcceptedRequests(prev => new Set([...prev, requestId]));

        // Update the selected request with contact details
        if (data.request) {
          setSelectedRequest(prev => ({
            ...prev,
            name: data.request.requester.name,
            phone: data.request.requester.phone
          }));
        }

        fetchPublicRequests(); // Refresh the list
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to volunteer');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while volunteering');
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

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getBloodTypeColor = (bloodType) => {
    const colors = {
      'A+': 'bg-red-500/20 text-red-400',
      'A-': 'bg-red-600/20 text-red-300',
      'B+': 'bg-blue-500/20 text-blue-400',
      'B-': 'bg-blue-600/20 text-blue-300',
      'AB+': 'bg-purple-500/20 text-purple-400',
      'AB-': 'bg-purple-600/20 text-purple-300',
      'O+': 'bg-green-500/20 text-green-400',
      'O-': 'bg-green-600/20 text-green-300'
    };
    return colors[bloodType] || 'bg-gray-500/20 text-gray-400';
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-red-400 bg-clip-text text-transparent mb-2">
            Blood Donation Requests
          </h1>
          <p className="text-gray-300">Help save lives by donating blood to those in need</p>
        </div>
        <div className="flex items-center space-x-2 text-red-400">
          <HeartIcon className="w-8 h-8" />
          <span className="text-2xl font-bold">{requests.length}</span>
          <span className="text-gray-300">Active Requests</span>
        </div>
      </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <HeartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No blood requests found</h3>
          <p className="text-gray-300">There are currently no active blood donation requests.</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {requests.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-300"
                onClick={() => openRequestModal(request)}
              >
                {/* Urgency Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                    {request.urgencyLevel?.toUpperCase() || 'MEDIUM'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getBloodTypeColor(request.bloodType)}`}>
                    {request.bloodType}
                  </span>
                </div>

                {/* Request Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <HeartIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-white font-medium">{request.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm truncate">
                      {typeof request.location === 'object' ? request.location.address : request.location}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openRequestModal(request);
                  }}
                  className={`w-full mt-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                    acceptedRequests.has(request._id)
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                  }`}
                >
                  {acceptedRequests.has(request._id) ? 'View Requester Details' : 'View Details & Help'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
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
              className="bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h2 className="text-2xl font-bold text-white">Blood Donation Request</h2>
                <button
                  onClick={closeRequestModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-300" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Request Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Request Information</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Blood Type:</span>
                        <span className={`px-3 py-1 rounded-full font-bold ${getBloodTypeColor(selectedRequest.bloodType)}`}>
                          {selectedRequest.bloodType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Urgency:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(selectedRequest.urgencyLevel)}`}>
                          {selectedRequest.urgencyLevel?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Requested by:</span>
                        <span className="text-white font-medium">
                          {acceptedRequests.has(selectedRequest._id) ? selectedRequest.name : 'Hidden until you volunteer'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Date:</span>
                        <span className="text-white">
                          {new Date(selectedRequest.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-300 block mb-2">Location:</span>
                        <div className="bg-white/10 rounded-lg p-3">
                          <p className="text-white text-sm">
                            {typeof selectedRequest.location === 'object' 
                              ? selectedRequest.location.address 
                              : selectedRequest.location}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-300 block mb-2">Contact:</span>
                        <div className="bg-white/10 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <PhoneIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-white">
                              {acceptedRequests.has(selectedRequest._id)
                                ? selectedRequest.phone
                                : 'Hidden until you volunteer'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Action Panel */}
                <div className="space-y-6">
                  {acceptedRequests.has(selectedRequest._id) ? (
                    /* Already Accepted - Show Requester Details */
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Requester Contact Details</h3>

                      <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">You've Volunteered!</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Thank you for volunteering to help. Here are the requester's contact details to coordinate the donation.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white/10 rounded-lg p-4">
                          <h4 className="text-white font-medium mb-3">Contact Information:</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Name:</span>
                              <span className="text-white font-medium">{selectedRequest.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Phone:</span>
                              <a
                                href={`tel:${selectedRequest.phone}`}
                                className="text-blue-400 hover:text-blue-300 font-medium"
                              >
                                {selectedRequest.phone}
                              </a>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300">Location:</span>
                              <span className="text-white text-sm text-right">
                                {typeof selectedRequest.location === 'object'
                                  ? selectedRequest.location.address
                                  : selectedRequest.location}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
                          <h4 className="text-blue-400 font-medium mb-2">Next Steps:</h4>
                          <ul className="text-gray-300 text-sm space-y-1">
                            <li>• Call the requester to coordinate</li>
                            <li>• Confirm donation time and location</li>
                            <li>• Ensure you meet donation requirements</li>
                            <li>• Complete the blood donation process</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Not Accepted Yet - Show Volunteer Option */
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">How You Can Help</h3>

                      <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2 mb-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">Important Information</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          By volunteering, you agree to contact the requester and coordinate the blood donation process.
                          Please ensure you are eligible to donate blood.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white/10 rounded-lg p-4">
                          <h4 className="text-white font-medium mb-2">Donation Requirements:</h4>
                          <ul className="text-gray-300 text-sm space-y-1">
                            <li>• Age: 18-65 years</li>
                            <li>• Weight: Minimum 50kg</li>
                            <li>• Good health condition</li>
                            <li>• No recent illness or medication</li>
                          </ul>
                        </div>

                        <button
                          onClick={() => handleVolunteer(selectedRequest._id)}
                          className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-medium text-lg"
                        >
                          I Want to Help - Contact Requester
                        </button>

                        <p className="text-gray-400 text-xs text-center">
                          Your contact information will be shared with the requester
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicRequestsPage;
