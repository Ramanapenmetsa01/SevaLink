import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  UserGroupIcon,
  MapPinIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { showError } from '../utils/alerts';

const VolunteerAcceptedRequests = () => {
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
        console.log('Accepted requests data:', data.requests); // Debug log
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
    console.log('Opening modal for request:', request); // Debug log
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
    setShowModal(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'blood':
        return HeartIcon;
      case 'elder_support':
        return UserGroupIcon;
      case 'complaint':
        return ExclamationTriangleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getTypeTitle = (type) => {
    switch (type) {
      case 'blood': return 'Blood Donation Match';
      case 'elder_support': return 'Elder Support Match';
      case 'complaint': return 'Complaint Assignment';
      default: return 'Support Request';
    }
  };

  const getTypeDescription = (type) => {
    switch (type) {
      case 'blood': return 'A requester needs blood donation. Contact them to coordinate the donation.';
      case 'elder_support': return 'An elderly person needs assistance. Contact them to coordinate the support.';
      case 'complaint': return 'A community issue needs attention. Work with the citizen to resolve this complaint.';
      default: return 'A support request needs your assistance.';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'accepted': return 'text-green-400 bg-green-500/20';
      case 'completed': return 'text-blue-400 bg-blue-500/20';
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





  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  const RequestCard = ({ request }) => {
    const acceptance = request.accepters?.find(a => a.user === request.currentUserId) ||
                     request.acceptance ||
                     { status: 'accepted', acceptedAt: request.createdAt };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300"
      >
        {/* Status and Blood Type */}
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(acceptance.status)}`}>
            {acceptance.status.toUpperCase()}
          </span>
          {request.type === 'blood' && request.bloodType && (
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getBloodTypeColor(request.bloodType)}`}>
              {request.bloodType}
            </span>
          )}
        </div>

        {/* Header with Request Type */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-blue-500/20 px-3 py-1 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">YOUR REQUEST</span>
          </div>
          {request.type === 'blood' && request.bloodType && (
            <div className="bg-red-500 px-3 py-1 rounded-lg">
              <span className="text-white font-bold">{request.bloodType}</span>
            </div>
          )}
          {request.type === 'elder_support' && request.serviceType && (
            <div className="bg-green-500 px-3 py-1 rounded-lg">
              <span className="text-white font-medium text-sm">{request.serviceType}</span>
            </div>
          )}
          {request.type === 'complaint' && request.category && (
            <div className="bg-orange-500 px-3 py-1 rounded-lg">
              <span className="text-white font-medium text-sm">{request.category}</span>
            </div>
          )}
        </div>

        {/* Minimal Request Info */}
        <div className="space-y-3 mb-6">

          {/* Contact Person */}
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
              <HeartIcon className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-white font-medium">
              {request.type === 'blood' ? 'Donor' :
               request.type === 'elder_support' ? 'Elder' :
               'Citizen'}: {request.name}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center space-x-3">
            <MapPinIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300 text-sm">
              {request.location?.address}
            </span>
          </div>

          {/* Matched Date */}
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300 text-sm">
              Matched: {formatDate(acceptance.acceptedAt)}
            </span>
          </div>

          {/* Priority/Status */}
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${
                (request.urgencyLevel === 'urgent' || request.priority === 'urgent') ? 'bg-red-400' :
                (request.urgencyLevel === 'high' || request.priority === 'high') ? 'bg-orange-400' :
                (request.urgencyLevel === 'medium' || request.priority === 'medium') ? 'bg-yellow-400' : 'bg-green-400'
              }`}></div>
            </div>
            <span className={`text-sm font-medium ${
              (request.urgencyLevel === 'urgent' || request.priority === 'urgent') ? 'text-red-400' :
              (request.urgencyLevel === 'high' || request.priority === 'high') ? 'text-orange-400' :
              (request.urgencyLevel === 'medium' || request.priority === 'medium') ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {(request.urgencyLevel || request.priority || 'MEDIUM').toUpperCase()} Priority
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openRequestModal(request);
          }}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-medium"
        >
          View Contact Details
        </button>
      </motion.div>
    );
  };

  const RequestDetailModal = ({ request, onClose }) => {
    if (!request) return null;

    const Icon = getTypeIcon(request.type);
    const acceptance = request.accepters?.find(a => a.user === request.currentUserId) || 
                     request.acceptance || 
                     { status: 'accepted', acceptedAt: request.createdAt };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{getTypeTitle(request.type)}</h2>
                  <p className="text-blue-100">{request.type.replace('_', ' ')} Request</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Success Message */}
            <div className="bg-green-500/20 border border-green-400/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Successfully Matched!</span>
              </div>
              <p className="text-gray-300 text-sm">
                {getTypeDescription(request.type)}
              </p>
            </div>

            {/* Type-specific Information */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">Request Information</h3>
              <div className="space-y-3">
                {request.type === 'blood' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Blood Type:</span>
                      <span className="text-red-400 font-medium text-lg">{request.bloodType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Priority:</span>
                      <span className={`font-medium ${
                        request.urgencyLevel === 'urgent' ? 'text-red-400' :
                        request.urgencyLevel === 'high' ? 'text-orange-400' :
                        request.urgencyLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {request.urgencyLevel?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400 font-medium">MATCHED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matched Date:</span>
                      <span className="text-gray-300">{formatDate(acceptance.acceptedAt)}</span>
                    </div>
                  </>
                )}

                {request.type === 'elder_support' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Service Type:</span>
                      <span className="text-blue-400 font-medium">{request.serviceType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Due Date:</span>
                      <span className="text-yellow-400 font-medium">
                        {request.dueDate ? formatDate(request.dueDate) : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matched Date:</span>
                      <span className="text-gray-300">{formatDate(acceptance.acceptedAt)}</span>
                    </div>
                  </>
                )}

                {request.type === 'complaint' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-orange-400 font-medium">{request.category || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Priority:</span>
                      <span className={`font-medium ${
                        request.priority === 'urgent' ? 'text-red-400' :
                        request.priority === 'high' ? 'text-orange-400' :
                        request.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {request.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Assigned Date:</span>
                      <span className="text-gray-300">{formatDate(acceptance.acceptedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Complaint Details */}
            {request.type === 'complaint' && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Complaint Details</h3>
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <span className="text-gray-400 text-sm">Title:</span>
                    <p className="text-white font-medium mt-1">{request.title || 'No title provided'}</p>
                  </div>

                  {/* Description */}
                  <div>
                    <span className="text-gray-400 text-sm">Description:</span>
                    <p className="text-gray-300 mt-1 leading-relaxed">{request.description || 'No description provided'}</p>
                  </div>

                  {/* Images */}
                  {request.images && request.images.length > 0 ? (
                    <div>
                      <span className="text-gray-400 text-sm">Images ({request.images.length}):</span>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {request.images.map((image, index) => {
                          console.log('Image data:', image); // Debug log
                          const imageUrl = typeof image === 'string' ? image : image.url;
                          return (
                            <div key={index} className="relative">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-600"
                                  onError={(e) => {
                                    console.log('Image failed to load:', imageUrl);
                                    e.target.style.display = 'none';
                                  }}
                                  onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                                />
                              ) : (
                                <div className="w-full h-32 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">No image URL</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-400 text-sm">Images:</span>
                      <p className="text-gray-500 text-sm mt-1">No images attached</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-4">
                {request.type === 'blood' ? 'Donor Contact' :
                 request.type === 'elder_support' ? 'Elder Contact' :
                 'Citizen Contact'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-medium">{request.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <a href={`tel:${request.phone}`} className="text-blue-400 font-medium hover:text-blue-300">
                    📞 {request.phone}
                  </a>
                </div>
                {request.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <a href={`mailto:${request.email}`} className="text-blue-400 font-medium hover:text-blue-300">
                      📧 {request.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Location</h3>
              <div className="flex items-start space-x-3">
                <MapPinIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div className="text-gray-300">
                  <p>{request.location?.address}</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Next Steps:</h3>
              <ul className="space-y-2 text-gray-300">
                {request.type === 'blood' && (
                  <>
                    <li>• Contact each other to coordinate</li>
                    <li>• Confirm donation time and location</li>
                    <li>• Ensure donor meets requirements</li>
                    <li>• Complete the blood donation process</li>
                  </>
                )}
                {request.type === 'elder_support' && (
                  <>
                    <li>• Contact the elder to coordinate</li>
                    <li>• Confirm service time and requirements</li>
                    <li>• Provide the requested assistance</li>
                    <li>• Follow up to ensure satisfaction</li>
                  </>
                )}
                {request.type === 'complaint' && (
                  <>
                    <li>• Contact the citizen to understand the issue</li>
                    <li>• Assess the situation and requirements</li>
                    <li>• Work together to resolve the complaint</li>
                    <li>• Update the status once resolved</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </motion.div>
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
        <h1 className="text-4xl font-bold text-white mb-4">My Accepted Requests</h1>
        <p className="text-gray-300 text-lg">Manage and track the requests you've accepted to help with</p>
      </motion.div>

      {/* Requests Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : acceptedRequests.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {acceptedRequests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No accepted requests</h3>
          <p className="text-gray-400 mb-6">You haven't accepted any requests yet. Browse available requests to start helping!</p>
          <button
            onClick={() => window.location.href = '/volunteer-dashboard/all-requests'}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
          >
            Browse Requests
          </button>
        </motion.div>
      )}

      {/* Request Detail Modal */}
      <AnimatePresence>
        {showModal && selectedRequest && (
          <RequestDetailModal
            request={selectedRequest}
            onClose={closeRequestModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolunteerAcceptedRequests;
