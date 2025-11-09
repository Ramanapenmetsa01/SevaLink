import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Navbar from './components/layout/Navbar';
import DashboardLayout from './components/layout/DashboardLayout';
import VolunteerDashboardLayout from './components/layout/VolunteerDashboardLayout';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ChatBot from './components/chatbot/ChatBot';
import PageLoader from './components/ui/PageLoader';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignupPage = React.lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));

const DashboardHome = React.lazy(() => import('./pages/DashboardHome'));
const VolunteerDashboardHome = React.lazy(() => import('./pages/VolunteerDashboardHome'));
const AddRequestPage = React.lazy(() => import('./pages/AddRequestPage'));
const VolunteerAddBloodRequest = React.lazy(() => import('./pages/VolunteerAddBloodRequest'));
const AllRequestsPage = React.lazy(() => import('./pages/AllRequestsPage'));
const VolunteerAllRequests = React.lazy(() => import('./pages/VolunteerAllRequests'));
const PublicRequestsPage = React.lazy(() => import('./pages/PublicRequestsPage'));
const AcceptedRequestsPage = React.lazy(() => import('./pages/AcceptedRequestsPage'));
const VolunteerAcceptedRequests = React.lazy(() => import('./pages/VolunteerAcceptedRequests'));
const AcceptedBloodRequestsPage = React.lazy(() => import('./pages/AcceptedBloodRequestsPage'));
const ComplaintsPage = React.lazy(() => import('./pages/ComplaintsPage'));
const BloodDonationPage = React.lazy(() => import('./pages/BloodDonationPage'));
const ElderlySupport = React.lazy(() => import('./pages/ElderlySupport'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const VolunteerDashboard = React.lazy(() => import('./pages/VolunteerDashboard'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ChatAIPage = React.lazy(() => import('./pages/ChatAIPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));



function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Navbar />
              <HomePage />
              <Footer />
            </>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Dashboard Routes with Layout - Citizens only */}
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="citizen">
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="add-request" element={<AddRequestPage />} />
          <Route path="requests" element={<AllRequestsPage />} />
          <Route path="all-requests" element={<PublicRequestsPage />} />
          <Route path="accepted-requests" element={<AcceptedRequestsPage />} />
          <Route path="blood-matches" element={<AcceptedBloodRequestsPage />} />
          <Route path="chat" element={<ChatAIPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Volunteer Dashboard Routes with Layout */}
        <Route path="/volunteer-dashboard" element={
          <ProtectedRoute requiredRole="volunteer">
            <VolunteerDashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<VolunteerDashboardHome />} />
          <Route path="add-blood-request" element={<VolunteerAddBloodRequest />} />
          <Route path="my-requests" element={<AllRequestsPage />} />
          <Route path="all-requests" element={<VolunteerAllRequests />} />
          <Route path="accepted-requests" element={<VolunteerAcceptedRequests />} />
          <Route path="chat" element={<ChatAIPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Legacy Routes (with old navbar/footer) */}
        <Route path="/complaints" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <ComplaintsPage />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/blood-donation" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <BloodDonationPage />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/elderly-support" element={
          <>
            <Navbar />
            <ProtectedRoute>
              <ElderlySupport />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        {/* Role-specific Routes */}
        <Route path="/admin" element={
          <>
            <Navbar />
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
            <Footer />
          </>
        } />

        <Route path="/volunteer" element={
          <>
            <Navbar />
            <ProtectedRoute requiredRole="volunteer">
              <VolunteerDashboard />
            </ProtectedRoute>
            <Footer />
          </>
        } />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <ChatBot />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#22c55e',
              secondary: '#black',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ef4444',
              secondary: '#black',
            },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
