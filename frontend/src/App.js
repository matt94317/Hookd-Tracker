import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import NewCampaignPage from './pages/campaigns/NewCampaignPage';
import EditCampaignPage from './pages/campaigns/EditCampaignPage';
import CampaignDetailsPage from './pages/campaigns/CampaignDetailsPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SettingsPage from './pages/settings/SettingsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import AccountsPage from './pages/accounts/AccountsPage';
import OAuthSuccessPage from './pages/oauth/OAuthSuccessPage';
import OAuthErrorPage from './pages/oauth/OAuthErrorPage';
import PlanSelectionPage from './pages/settings/PlanSelectionPage';
import PostsPage from './pages/posts/PostsPage';
import PayrollPage from './pages/payroll/PayrollPage';

function App() {
  return (
    <ThemeProvider>
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
          <Route path="/payroll" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
          <Route path="/plan-selection" element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PostsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
