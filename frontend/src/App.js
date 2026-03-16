import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import NewCampaignPage from './pages/campaigns/NewCampaignPage';
import EditCampaignPage from './pages/campaigns/EditCampaignPage';
import CampaignDetailsPage from './pages/campaigns/CampaignDetailsPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import CreatorHomePage from './pages/CreatorHomePage';
import CreatorsPage from './pages/CreatorsPage';
import CreatorAnalyticsPage from './pages/CreatorAnalyticsPage';

function HomeRoute() {
  const { user } = useAuth();
  return user?.role === 'creator' ? <CreatorHomePage /> : <DashboardPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
          <Route path="/campaigns/new" element={<ProtectedRoute><NewCampaignPage /></ProtectedRoute>} />
          <Route path="/campaigns/:id/edit" element={<ProtectedRoute><EditCampaignPage /></ProtectedRoute>} />
          <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetailsPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><CreatorAnalyticsPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute><PlaceholderPage title="Payroll" /></ProtectedRoute>} />
          <Route path="/creators" element={<ProtectedRoute><CreatorsPage /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PlaceholderPage title="Posts" /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
