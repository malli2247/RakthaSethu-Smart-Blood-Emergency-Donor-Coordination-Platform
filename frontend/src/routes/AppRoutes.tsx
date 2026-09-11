import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

// Public pages
import { LandingPage } from '../pages/public/LandingPage';
import { FindBloodPage } from '../pages/public/FindBloodPage';
import { CompatibilityPage } from '../pages/public/CompatibilityPage';
import { CampaignsPage } from '../pages/public/CampaignsPage';
import { HowItWorksPage } from '../pages/public/HowItWorksPage';
import { FaqPage } from '../pages/public/FaqPage';

// Auth pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Donor pages
import { DonorDashboard } from '../pages/donor/DonorDashboard';
import { DonorRequestsPage } from '../pages/donor/DonorRequestsPage';
import { DonorHistoryPage } from '../pages/donor/DonorHistoryPage';
import { DonorProfilePage } from '../pages/donor/DonorProfilePage';

// Patient pages
import { PatientDashboard } from '../pages/patient/PatientDashboard';
import { CreateRequestPage } from '../pages/patient/CreateRequestPage';
import { RequestDetailsPage } from '../pages/patient/RequestDetailsPage';

// Hospital pages
import { HospitalDashboard } from '../pages/hospital/HospitalDashboard';
import { ManageRequestsPage } from '../pages/hospital/ManageRequestsPage';

// Blood Bank pages
import { BloodBankDashboard } from '../pages/bloodbank/BloodBankDashboard';
import { InventoryPage } from '../pages/bloodbank/InventoryPage';

// Volunteer pages
import { VolunteerDashboard } from '../pages/volunteer/VolunteerDashboard';

// Admin pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminVerificationsPage } from '../pages/admin/AdminVerificationsPage';
import { CommandCenterPage } from '../pages/admin/CommandCenterPage';
import { EmergencySimulatorPage } from '../pages/admin/EmergencySimulatorPage';

// Blood Bank Copilot
import { CopilotPage } from '../pages/bloodbank/CopilotPage';

// Emergency Progressive Search & Coordination Room
import { ProgressiveSearchScreen } from '../pages/emergency/ProgressiveSearchScreen';
import { CoordinationRoomPage } from '../pages/coordination/CoordinationRoomPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/find-blood" element={<FindBloodPage />} />
        <Route path="/compatibility" element={<CompatibilityPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/patient/create-request" element={<CreateRequestPage />} />
        <Route path="/patient/requests/:id" element={<RequestDetailsPage />} />
        <Route path="/emergency/search/:id" element={<ProgressiveSearchScreen />} />
        <Route path="/coordination/:id" element={<CoordinationRoomPage />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Donor */}
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/donor/requests" element={<DonorRequestsPage />} />
        <Route path="/donor/history" element={<DonorHistoryPage />} />
        <Route path="/donor/profile" element={<DonorProfilePage />} />

        {/* Patient */}
        <Route path="/patient/dashboard" element={<PatientDashboard />} />

        {/* Hospital */}
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/requests" element={<ManageRequestsPage />} />
        <Route path="/hospital/confirm-donation" element={<ManageRequestsPage />} />

        {/* Blood Bank */}
        <Route path="/bloodbank/dashboard" element={<BloodBankDashboard />} />
        <Route path="/bloodbank/inventory" element={<InventoryPage />} />
        <Route path="/bloodbank/copilot" element={<CopilotPage />} />

        {/* Volunteer */}
        <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/command-center" element={<CommandCenterPage />} />
        <Route path="/admin/simulator" element={<EmergencySimulatorPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
