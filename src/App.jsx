import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import TournamentsPage from './pages/public/TournamentsPage';
import RegisterTeamPage from './pages/public/RegisterTeamPage';
import LiveScoreboardPage from './pages/public/LiveScoreboardPage';
import MatchDetailsPage from './pages/public/MatchDetailsPage';
import BracketPage from './pages/public/BracketPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminTournamentsPage from './pages/admin/AdminTournamentsPage';
import AdminRegistrationsPage from './pages/admin/AdminRegistrationsPage';
import AdminFixturesPage from './pages/admin/AdminFixturesPage';
import AdminLiveScoringPage from './pages/admin/AdminLiveScoringPage';
import AdminMatchScoresPage from './pages/admin/AdminMatchScoresPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="tournaments" element={<TournamentsPage />} />
          <Route path="tournaments/:id" element={<BracketPage />} />
          <Route path="register" element={<RegisterTeamPage />} />
          <Route path="live" element={<LiveScoreboardPage />} />
          <Route path="matches/:id" element={<MatchDetailsPage />} />
          <Route path="bracket" element={<BracketPage />} />
        </Route>

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="tournaments" element={<AdminTournamentsPage />} />
          <Route path="registrations" element={<AdminRegistrationsPage />} />
          <Route path="fixtures" element={<AdminFixturesPage />} />
          <Route path="scoring" element={<AdminLiveScoringPage />} />
          <Route path="scores" element={<AdminMatchScoresPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
