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
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

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

const roleDashboards: Record<string, string> = {
  DONOR: '/donor/dashboard',
  PATIENT: '/patient/dashboard',
  ATTENDANT: '/patient/dashboard',
  HOSPITAL: '/hospital/dashboard',
  BLOOD_BANK: '/bloodbank/dashboard',
  VOLUNTEER: '/volunteer/dashboard',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
};

const ProtectedRoute: React.FC<{ children: React.ReactElement; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-medium">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying role authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const effectiveAllowed = allowedRoles.includes('ADMIN')
      ? [...allowedRoles, 'SUPER_ADMIN']
      : allowedRoles;

    if (!effectiveAllowed.includes(user.role)) {
      const userDashboard = roleDashboards[user.role] || '/';
      return <Navigate to={userDashboard} replace />;
    }
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/patient/create-request" element={<CreateRequestPage />} />
        <Route path="/patient/requests/:id" element={<RequestDetailsPage />} />
        <Route path="/emergency/search/:id" element={<ProgressiveSearchScreen />} />
        <Route path="/coordination/:id" element={<CoordinationRoomPage />} />
      </Route>

      {/* Protected Dashboard Routes with Strict RBAC Isolation */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Donor Workflow */}
        <Route path="/donor/dashboard" element={<ProtectedRoute allowedRoles={['DONOR']}><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/requests" element={<ProtectedRoute allowedRoles={['DONOR']}><DonorRequestsPage /></ProtectedRoute>} />
        <Route path="/donor/history" element={<ProtectedRoute allowedRoles={['DONOR']}><DonorHistoryPage /></ProtectedRoute>} />
        <Route path="/donor/profile" element={<ProtectedRoute allowedRoles={['DONOR']}><DonorProfilePage /></ProtectedRoute>} />

        {/* Receiver / Patient Workflow */}
        <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['PATIENT', 'ATTENDANT']}><PatientDashboard /></ProtectedRoute>} />

        {/* Hospital Workflow */}
        <Route path="/hospital/dashboard" element={<ProtectedRoute allowedRoles={['HOSPITAL']}><HospitalDashboard /></ProtectedRoute>} />
        <Route path="/hospital/requests" element={<ProtectedRoute allowedRoles={['HOSPITAL']}><ManageRequestsPage /></ProtectedRoute>} />
        <Route path="/hospital/confirm-donation" element={<ProtectedRoute allowedRoles={['HOSPITAL']}><ManageRequestsPage /></ProtectedRoute>} />

        {/* Blood Bank Workflow */}
        <Route path="/bloodbank/dashboard" element={<ProtectedRoute allowedRoles={['BLOOD_BANK']}><BloodBankDashboard /></ProtectedRoute>} />
        <Route path="/bloodbank/inventory" element={<ProtectedRoute allowedRoles={['BLOOD_BANK']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/bloodbank/copilot" element={<ProtectedRoute allowedRoles={['BLOOD_BANK']}><CopilotPage /></ProtectedRoute>} />

        {/* Volunteer Workflow */}
        <Route path="/volunteer/dashboard" element={<ProtectedRoute allowedRoles={['VOLUNTEER']}><VolunteerDashboard /></ProtectedRoute>} />

        {/* Super Admin & Admin Workflow */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/command-center" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><CommandCenterPage /></ProtectedRoute>} />
        <Route path="/admin/simulator" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><EmergencySimulatorPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/verifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}><AdminVerificationsPage /></ProtectedRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
