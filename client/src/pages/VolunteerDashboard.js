import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';
import ComplaintDetailModal from '../components/complaints/ComplaintDetailModal';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: { assigned: 0, available: 0, totalResolved: 0 },
    assignedComplaints: [],
    availableComplaints: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/complaints/dashboard/volunteer', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        showError('Error', 'Failed to fetch dashboard data');
      }
    } catch (error) {
      showError('Error', 'Network error while fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'volunteer') {
      fetchDashboardData();
    }
  }, [user]);

  const handleApplyForComplaint = async (complaintId) => {
    try {
      showLoading('Applying for complaint...');

      const response = await fetch(`/api/complaints/${complaintId}/apply`, {
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
        fetchDashboardData();
      } else {
        const data = await response.json();
        closeLoading();
        showError('Error', data.message || 'Failed to apply for complaint');
      }
    } catch (error) {
      closeLoading();
      showError('Error', 'Network error while applying for complaint');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ComplaintCard = ({ complaint, showApplyButton = false }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 cursor-pointer"
      onClick={() => setSelectedComplaint(complaint)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{complaint.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{complaint.description}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
            {complaint.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
            {complaint.priority.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <MapPinIcon className="w-4 h-4" />
            <span>{complaint.category.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ClockIcon className="w-4 h-4" />
            <span>{formatDate(complaint.createdAt)}</span>
          </div>
        </div>

        {showApplyButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleApplyForComplaint(complaint._id);
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
          >
            Apply
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Submitted by: {complaint.citizen.name}</span>
        </div>
      </div>
    </motion.div>
  );

  if (user?.role !== 'volunteer') {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This page is only accessible to volunteers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Volunteer Dashboard</h1>
          <p className="text-gray-600">Help resolve community issues and make a difference</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ClipboardDocumentListIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Assigned</h3>
                <p className="text-3xl font-bold text-blue-600">{dashboardData.stats.assigned}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <UserGroupIcon className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Available</h3>
                <p className="text-3xl font-bold text-yellow-600">{dashboardData.stats.available}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Resolved</h3>
                <p className="text-3xl font-bold text-green-600">{dashboardData.stats.totalResolved}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Assigned Complaints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Assigned Complaints</h2>
              {dashboardData.assignedComplaints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.assignedComplaints.map((complaint) => (
                    <ComplaintCard key={complaint._id} complaint={complaint} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Complaints</h3>
                  <p className="text-gray-600">You don't have any assigned complaints yet. Check available complaints below.</p>
                </div>
              )}
            </motion.div>

            {/* Available Complaints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Complaints</h2>
              {dashboardData.availableComplaints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardData.availableComplaints.map((complaint) => (
                    <ComplaintCard
                      key={complaint._id}
                      complaint={complaint}
                      showApplyButton={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Available Complaints</h3>
                  <p className="text-gray-600">There are no open complaints available for application at the moment.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdate={fetchDashboardData}
      />
    </div>
  );
};

export default VolunteerDashboard;
