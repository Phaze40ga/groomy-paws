import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { NotificationProvider } from './components/NotificationProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

import { Dashboard } from './pages/customer/Dashboard';
import { PetsPage } from './pages/customer/PetsPage';
import { BookAppointmentPage } from './pages/customer/BookAppointmentPage';
import { AppointmentsPage } from './pages/customer/AppointmentsPage';
import { ProfilePage } from './pages/customer/ProfilePage';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAppointments } from './pages/admin/AdminAppointments';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { MessagesPage } from './pages/customer/MessagesPage';
import { NotificationsPage } from './pages/customer/NotificationsPage';
import { PaymentsPage } from './pages/customer/PaymentsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminAutomation } from './pages/admin/AdminAutomation';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' || user?.role === 'staff' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Dashboard />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/pets"
        element={
          <ProtectedRoute>
            <PetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book"
        element={
          <ProtectedRoute>
            <BookAppointmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            {user?.role === 'admin' || user?.role === 'staff' ? (
              <Navigate to="/admin/payments" replace />
            ) : (
              <PaymentsPage />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute>
            <AdminAppointments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute>
            <AdminCustomers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/services"
        element={
          <ProtectedRoute>
            <AdminServices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/messages"
        element={
          <ProtectedRoute>
            <AdminMessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute>
            <AdminPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <ProtectedRoute>
            <AdminCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/automation"
        element={
          <ProtectedRoute>
            <AdminAutomation />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </BrowserRouter>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
