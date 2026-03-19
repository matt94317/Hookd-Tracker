import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import AccountsPage from './pages/AccountsPage';
import OAuthSuccessPage from './pages/OAuthSuccessPage';
import OAuthErrorPage from './pages/OAuthErrorPage';
import CreatorsPage from './pages/CreatorsPage';
import CreatorAnalyticsPage from './pages/CreatorAnalyticsPage';
import PlanSelectionPage from './pages/PlanSelectionPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth/success" element={<OAuthSuccessPage />} />
          <Route path="/oauth/error" element={<OAuthErrorPage />} />
          <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
          <Route path="/campaigns/new" element={<ProtectedRoute><NewCampaignPage /></ProtectedRoute>} />
          <Route path="/campaigns/:id/edit" element={<ProtectedRoute><EditCampaignPage /></ProtectedRoute>} />
          <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetailsPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute><PlaceholderPage title="Payroll" /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
          <Route path="/creators" element={<ProtectedRoute><CreatorsPage /></ProtectedRoute>} />
          <Route path="/plan-selection" element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PlaceholderPage title="Posts" /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
