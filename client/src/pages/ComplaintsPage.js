import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { showError, showSuccess, showLoading, closeLoading } from '../utils/alerts';
import { useDebounce } from '../hooks/useDebounce';
import CreateComplaintForm from '../components/complaints/CreateComplaintForm';
import ComplaintDetailModal from '../components/complaints/ComplaintDetailModal';
import Pagination from '../components/ui/Pagination';
import { CardGridSkeleton } from '../components/ui/SkeletonLoader';

const ComplaintsPage = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    type: '',
    priority: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalComplaints: 0,
    limit: 12
  });

  // Debounce filters to reduce API calls
  const debouncedFilters = useDebounce(filters, 500);

  // Fetch complaints
  const fetchComplaints = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(debouncedFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      queryParams.append('page', page);
      queryParams.append('limit', pagination.limit);

      const response = await fetch(`/api/complaints?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints);
        setPagination(data.pagination);
      } else {
        showError('Error', 'Failed to fetch complaints');
      }
    } catch (error) {
      showError('Error', 'Network error while fetching complaints');
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, pagination.limit]);

  useEffect(() => {
    fetchComplaints(1);
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [debouncedFilters, fetchComplaints]);

  const handlePageChange = (page) => {
    fetchComplaints(page);
    setPagination(prev => ({ ...prev, current: page }));
  };

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

  const ComplaintCard = ({ complaint }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 p-6 cursor-pointer"
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

        {user?.role === 'volunteer' && complaint.status === 'open' && (
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

      {complaint.assignedVolunteer && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <UserIcon className="w-4 h-4" />
            <span>Assigned to: {complaint.assignedVolunteer.name}</span>
          </div>
        </div>
      )}
    </motion.div>
  );

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
        fetchComplaints();
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {user?.role === 'citizen' ? 'My Complaints' : 'Community Complaints'}
            </h1>
            <p className="text-gray-600">
              {user?.role === 'citizen'
                ? 'Track your submitted complaints and service requests'
                : 'Help resolve community issues and service requests'
              }
            </p>
          </div>

          {user?.role === 'citizen' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Complaint</span>
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="sanitation">Sanitation</option>
              <option value="water_supply">Water Supply</option>
              <option value="electricity">Electricity</option>
              <option value="road_maintenance">Road Maintenance</option>
              <option value="waste_management">Waste Management</option>
              <option value="public_safety">Public Safety</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="transportation">Transportation</option>
              <option value="elderly_care">Elderly Care</option>
              <option value="emergency_assistance">Emergency Assistance</option>
              <option value="community_service">Community Service</option>
              <option value="other">Other</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="complaint">Complaint</option>
              <option value="service_request">Service Request</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </motion.div>

        {/* Complaints Grid */}
        {loading ? (
          <CardGridSkeleton count={pagination.limit} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {complaints.map((complaint) => (
                <ComplaintCard key={complaint._id} complaint={complaint} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && complaints.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No complaints found</h3>
            <p className="text-gray-600">
              {user?.role === 'citizen'
                ? "You haven't submitted any complaints yet."
                : "No complaints match your current filters."
              }
            </p>
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && complaints.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Pagination
              currentPage={pagination.current}
              totalPages={pagination.total}
              totalItems={pagination.totalComplaints}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
            />
          </motion.div>
        )}
      </div>

      {/* Create Complaint Form Modal */}
      <CreateComplaintForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={fetchComplaints}
      />

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdate={fetchComplaints}
      />
    </div>
  );
};

export default ComplaintsPage;
