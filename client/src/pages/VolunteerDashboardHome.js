import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HeartIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { StatsSkeleton } from '../components/ui/SkeletonLoader';

const VolunteerDashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalHelped: 0,
    activeRequests: 0,
    acceptedRequests: 0,
    bloodDonations: 0,
    elderSupport: 0,
    rating: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [myBloodRequests, setMyBloodRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVolunteerDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/volunteer/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentRequests(data.recentRequests);
        setMyBloodRequests(data.myBloodRequests || []);
      } else {
        // Fallback to mock data if API fails
        setStats({
          totalHelped: user?.volunteerInfo?.totalHelped || 0,
          activeRequests: 0,
          acceptedRequests: 0,
          bloodDonations: 0,
          elderSupport: 0,
          rating: user?.volunteerInfo?.rating || 0
        });
        setRecentRequests([]);
        setMyBloodRequests([]);
      }
    } catch (error) {
      console.error('Error fetching volunteer dashboard data:', error);
      // Fallback to empty data
      setStats({
        totalHelped: user?.volunteerInfo?.totalHelped || 0,
        activeRequests: 0,
        acceptedRequests: 0,
        bloodDonations: 0,
        elderSupport: 0,
        rating: user?.volunteerInfo?.rating || 0
      });
      setRecentRequests([]);
      setMyBloodRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVolunteerDashboardData();
  }, [fetchVolunteerDashboardData]);

  const quickActions = [
    {
      title: 'Add Blood Request',
      description: 'Create a new blood donation request',
      icon: HeartIcon,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: () => navigate('/volunteer-dashboard/add-blood-request')
    },
    {
      title: 'View All Requests',
      description: 'Browse available requests to help',
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: () => navigate('/volunteer-dashboard/all-requests')
    },
    {
      title: 'My Accepted Requests',
      description: 'Manage your accepted requests',
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      action: () => navigate('/volunteer-dashboard/accepted-requests')
    }
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'blood':
        return HeartIcon;
      case 'elder_support':
        return UserGroupIcon;
      default:
        return ClipboardDocumentListIcon;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 rounded-2xl p-8 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <p className="text-blue-100 text-lg">
              Thank you for being a community hero. Ready to help someone today?
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.totalHelped}</div>
              <div className="text-sm text-blue-100">People Helped</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.rating.toFixed(1)}</div>
              <div className="text-sm text-blue-100">Rating</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {loading ? (
          <StatsSkeleton count={4} />
        ) : (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Active Requests</p>
                  <p className="text-3xl font-bold text-white">{stats.activeRequests}</p>
                </div>
                <ClockIcon className="w-8 h-8 text-orange-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Accepted Requests</p>
                  <p className="text-3xl font-bold text-white">{stats.acceptedRequests}</p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Blood Donations</p>
                  <p className="text-3xl font-bold text-white">{stats.bloodDonations}</p>
                </div>
                <HeartIcon className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Elder Support</p>
                  <p className="text-3xl font-bold text-white">{stats.elderSupport}</p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={action.action}
                className={`${action.color} ${action.hoverColor} text-white p-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
              >
                <Icon className="w-8 h-8 mb-4" />
                <h3 className="font-bold text-lg mb-2">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
        
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recentRequests.length > 0 ? (
          <div className="space-y-4">
            {recentRequests.map((request) => {
              const Icon = getTypeIcon(request.type);
              return (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/volunteer-dashboard/all-requests`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{request.title}</h3>
                      <p className="text-sm text-gray-300 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">No recent activity</p>
            <p className="text-gray-400">Start helping your community today!</p>
          </div>
        )}
      </motion.div>

      {/* My Blood Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
      >
        <h2 className="text-2xl font-bold text-white mb-6">My Blood Requests</h2>

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : myBloodRequests.length > 0 ? (
          <div className="space-y-4">
            {myBloodRequests.map((request) => (
              <div
                key={request._id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/volunteer-dashboard/my-requests`)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <HeartIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{request.bloodType} Blood Request</h3>
                    <p className="text-sm text-gray-300 flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {request.status.toUpperCase()}
                  </span>
                  {request.accepters && request.accepters.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {request.accepters.length} volunteer{request.accepters.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <HeartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">No blood requests created</p>
            <p className="text-gray-400">Create your first blood request to help others</p>
            <button
              onClick={() => navigate('/volunteer-dashboard/add-blood-request')}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Create Blood Request
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VolunteerDashboardHome;
