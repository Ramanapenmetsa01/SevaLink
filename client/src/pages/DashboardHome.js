import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  HeartIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { StatsSkeleton } from '../components/ui/SkeletonLoader';

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    bloodRequests: 0,
    elderSupport: 0,
    complaints: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats and recent requests
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentRequests(data.recentRequests);
      } else {
        // Fallback to mock data if API fails
        setStats({
          totalRequests: 0,
          pendingRequests: 0,
          acceptedRequests: 0,
          bloodRequests: 0,
          elderSupport: 0,
          complaints: 0
        });
        setRecentRequests([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to empty data
      setStats({
        totalRequests: 0,
        pendingRequests: 0,
        acceptedRequests: 0,
        bloodRequests: 0,
        elderSupport: 0,
        complaints: 0
      });
      setRecentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Blood Request',
      description: 'Request blood donation',
      icon: HeartIcon,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: () => navigate('/dashboard/add-request?type=blood')
    },
    {
      title: 'Elder Support',
      description: 'Request elderly care services',
      icon: UserGroupIcon,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      action: () => navigate('/dashboard/add-request?type=elder_support')
    },
    {
      title: 'Submit Complaint',
      description: 'Report community issues',
      icon: ExclamationTriangleIcon,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      action: () => navigate('/dashboard/add-request?type=complaint')
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-400',
      accepted: 'text-green-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const getTypeIcon = (type) => {
    const icons = {
      blood: HeartIcon,
      elder_support: UserGroupIcon,
      complaint: ExclamationTriangleIcon
    };
    return icons[type] || ClipboardDocumentListIcon;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl"
        >
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-blue-100 text-lg">
            Ready to make a difference in your community today?
          </p>
        </motion.div>

      {/* Stats Cards */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Requests</p>
              <p className="text-3xl font-bold text-white">{stats.totalRequests}</p>
            </div>
            <ClipboardDocumentListIcon className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pendingRequests}</p>
            </div>
            <ClockIcon className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Accepted</p>
              <p className="text-3xl font-bold text-green-400">{stats.acceptedRequests}</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-400" />
          </div>
        </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8"
      >
        <h2 className="text-2xl font-bold text-white mb-8">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className={`
                  ${action.color} ${action.hoverColor} text-white p-6 rounded-xl 
                  transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                `}
              >
                <Icon className="w-8 h-8 mb-3" />
                <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Request Type Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <HeartIcon className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-gray-300 text-sm">Blood Requests</p>
              <p className="text-2xl font-bold text-white">{stats.bloodRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <UserGroupIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-gray-300 text-sm">Elder Support</p>
              <p className="text-2xl font-bold text-white">{stats.elderSupport}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <p className="text-gray-300 text-sm">Complaints</p>
              <p className="text-2xl font-bold text-white">{stats.complaints}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Requests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-8"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Recent Requests</h2>
          <button
            onClick={() => navigate('/dashboard/requests')}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            View All
          </button>
        </div>

        <div className="space-y-4">
          {recentRequests.map((request) => {
            const Icon = getTypeIcon(request.type);
            return (
              <div
                key={request._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Icon className="w-6 h-6 text-gray-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <p className="text-sm text-gray-500">{formatDate(request.createdAt)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>

        {recentRequests.length === 0 && (
          <div className="text-center py-8">
            <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h3>
            <p className="text-gray-600 mb-4">Start by creating your first request</p>
            <button
              onClick={() => navigate('/dashboard/add-request')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Request
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardHome;
