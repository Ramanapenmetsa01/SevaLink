import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { showError, showSuccess, showLoading, closeLoading } from '../../utils/alerts';

const ComplaintDetailModal = ({ complaint, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [newUpdate, setNewUpdate] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !complaint) return null;

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
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

  const handleApplyForComplaint = async () => {
    try {
      setIsSubmitting(true);
      showLoading('Applying for complaint...');
      
      const response = await fetch(`/api/complaints/${complaint._id}/apply`, {
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

      if (response.ok) {
        closeLoading();
        showSuccess('Success', 'Application submitted successfully!');
        onUpdate();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to apply for complaint');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while applying for complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignVolunteer = async (volunteerId) => {
    try {
      setIsSubmitting(true);
      showLoading('Assigning volunteer...');
      
      const response = await fetch(`/api/complaints/${complaint._id}/assign/${volunteerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        closeLoading();
        showSuccess('Success', 'Volunteer assigned successfully!');
        onUpdate();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to assign volunteer');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while assigning volunteer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;

    try {
      setIsSubmitting(true);
      showLoading('Updating status...');
      
      const response = await fetch(`/api/complaints/${complaint._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: newStatus,
          message: newUpdate || `Status changed to ${newStatus}`
        })
      });

      if (response.ok) {
        closeLoading();
        showSuccess('Success', 'Status updated successfully!');
        setNewStatus('');
        setNewUpdate('');
        onUpdate();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to update status');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;

    try {
      setIsSubmitting(true);
      showLoading('Adding update...');
      
      const response = await fetch(`/api/complaints/${complaint._id}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: newUpdate
        })
      });

      if (response.ok) {
        closeLoading();
        showSuccess('Success', 'Update added successfully!');
        setNewUpdate('');
        onUpdate();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to add update');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while adding update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canApply = user?.role === 'volunteer' && 
                   complaint.status === 'open' && 
                   !complaint.volunteerApplications?.some(app => app.volunteer._id === user.id);

  const canAssign = (user?.role === 'citizen' && complaint.citizen._id === user.id) || 
                    user?.role === 'admin';

  const canUpdateStatus = (user?.role === 'volunteer' && complaint.assignedVolunteer?._id === user.id) ||
                          (user?.role === 'citizen' && complaint.citizen._id === user.id) ||
                          user?.role === 'admin';

  const canAddUpdate = complaint.citizen._id === user?.id ||
                       complaint.assignedVolunteer?._id === user?.id ||
                       user?.role === 'admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{complaint.title}</h2>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complaint.status)}`}>
                {complaint.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`text-sm font-medium ${getPriorityColor(complaint.priority)}`}>
                {complaint.priority.toUpperCase()} PRIORITY
              </span>
              <span className="text-sm text-gray-500">
                {complaint.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{complaint.description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium">{complaint.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Created:</span>
                    <span>{formatDate(complaint.createdAt)}</span>
                  </div>
                  {complaint.expectedResolutionTime && (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">Expected Resolution:</span>
                      <span>{complaint.expectedResolutionTime.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {complaint.location?.address && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    Location
                  </h4>
                  <div className="text-sm text-gray-700">
                    {[
                      complaint.location.address.street,
                      complaint.location.address.city,
                      complaint.location.address.state,
                      complaint.location.address.pincode
                    ].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* People Involved */}
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Submitted By</h4>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{complaint.citizen.name}</div>
                    <div className="text-sm text-gray-500">{complaint.citizen.email}</div>
                  </div>
                </div>
              </div>

              {complaint.assignedVolunteer && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Assigned Volunteer</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{complaint.assignedVolunteer.name}</div>
                      <div className="text-sm text-gray-500">{complaint.assignedVolunteer.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Volunteer Applications */}
          {complaint.volunteerApplications && complaint.volunteerApplications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Applications</h3>
              <div className="space-y-3">
                {complaint.volunteerApplications.map((application, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{application.volunteer.name}</div>
                          <div className="text-sm text-gray-500">
                            Applied {formatDate(application.appliedAt)}
                          </div>
                        </div>
                      </div>
                      {canAssign && complaint.status === 'open' && (
                        <button
                          onClick={() => handleAssignVolunteer(application.volunteer._id)}
                          disabled={isSubmitting}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                    {application.message && (
                      <p className="mt-2 text-sm text-gray-700">{application.message}</p>
                    )}
                    {application.estimatedTime && (
                      <p className="mt-1 text-xs text-gray-500">
                        Estimated time: {application.estimatedTime}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updates */}
          {complaint.updates && complaint.updates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                Updates
              </h3>
              <div className="space-y-3">
                {complaint.updates.map((update, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-700">{update.message}</p>
                        <div className="text-sm text-gray-500 mt-1">
                          By {update.updatedBy.name} • {formatDate(update.updatedAt)}
                        </div>
                      </div>
                      {update.statusChange && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {update.statusChange.from} → {update.statusChange.to}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-wrap gap-3">
              {canApply && (
                <button
                  onClick={handleApplyForComplaint}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Apply as Volunteer
                </button>
              )}

              {canUpdateStatus && (
                <div className="flex items-center space-x-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Update Status</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    {user?.role === 'admin' && <option value="cancelled">Cancelled</option>}
                  </select>
                  <button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || isSubmitting}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              )}
            </div>

            {/* Add Update */}
            {canAddUpdate && (
              <div className="mt-4">
                <textarea
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  placeholder="Add an update..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddUpdate}
                  disabled={!newUpdate.trim() || isSubmitting}
                  className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Add Update
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ComplaintDetailModal;
