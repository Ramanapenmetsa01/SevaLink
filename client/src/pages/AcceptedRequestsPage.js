import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  UserIcon,
  XMarkIcon,
  CheckCircleIcon,
  HeartIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { showError } from '../utils/alerts';

const AcceptedRequestsPage = () => {
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAcceptedRequests();
  }, []);

  const fetchAcceptedRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/accepted', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAcceptedRequests(data.requests || []);
      } else {
        showError('Error', 'Failed to fetch accepted requests');
        setAcceptedRequests([]);
      }
    } catch (error) {
      showError('Error', 'Network error while fetching accepted requests');
      setAcceptedRequests([]);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'accepted': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-green-400 bg-clip-text text-transparent mb-2">
            My Accepted Requests
          </h1>
          <p className="text-gray-300">Blood donation requests you've volunteered to help with</p>
        </div>
        <div className="flex items-center space-x-2 text-green-400">
          <CheckCircleIcon className="w-8 h-8" />
          <span className="text-2xl font-bold">{acceptedRequests.length}</span>
          <span className="text-gray-300">Accepted</span>
        </div>
      </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : acceptedRequests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No accepted requests</h3>
          <p className="text-gray-300">You haven't volunteered for any blood donation requests yet.</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {acceptedRequests.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 transition-all duration-300"
                onClick={() => openRequestModal(request)}
              >
                {/* Status and Blood Type */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.acceptance.status)}`}>
                    {request.acceptance.status.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getBloodTypeColor(request.bloodType)}`}>
                    {request.bloodType}
                  </span>
                </div>

                {/* Request Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <HeartIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-white font-medium">
                      Blood Donation Request
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      Requester: {request.name}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">
                      Contact: {request.phone}
                    </span>
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
                      Accepted: {new Date(request.acceptance.acceptedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {request.urgencyLevel && (
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm font-medium ${getUrgencyColor(request.urgencyLevel)}`}>
                        {request.urgencyLevel.toUpperCase()} Priority
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openRequestModal(request);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 font-medium"
                >
                  View Contact Details
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
                <h2 className="text-2xl font-bold text-white">Accepted Blood Request</h2>
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
                        <span className="text-white font-medium">{selectedRequest.name}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Request Date:</span>
                        <span className="text-white">
                          {new Date(selectedRequest.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Accepted Date:</span>
                        <span className="text-white">
                          {new Date(selectedRequest.acceptance.acceptedAt).toLocaleDateString()}
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
                            <span className="text-white">{selectedRequest.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Acceptance Status */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Your Volunteer Status</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">Volunteer Confirmed</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          You have volunteered to help with this blood donation request. 
                          Please coordinate with the requester to complete the donation.
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-2">Next Steps:</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                          <li>• Contact the requester using the phone number above</li>
                          <li>• Coordinate donation time and location</li>
                          <li>• Ensure you meet donation requirements</li>
                          <li>• Complete the blood donation process</li>
                        </ul>
                      </div>

                      <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-2">Requester Information:</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Name:</span>
                            <span className="text-white">{selectedRequest.requester?.name || selectedRequest.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Phone:</span>
                            <span className="text-white">{selectedRequest.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AcceptedRequestsPage;
