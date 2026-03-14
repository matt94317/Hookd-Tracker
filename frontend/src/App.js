import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import NewCampaignPage from './pages/campaigns/NewCampaignPage';
import EditCampaignPage from './pages/campaigns/EditCampaignPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PlaceholderPage from './pages/PlaceholderPage';

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
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><PlaceholderPage title="Home" /></ProtectedRoute>} />
          <Route path="/creators" element={<ProtectedRoute><PlaceholderPage title="Creators" /></ProtectedRoute>} />
          <Route path="/creator-dashboard" element={<ProtectedRoute><PlaceholderPage title="Creator Dashboard" /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><PlaceholderPage title="Posts" /></ProtectedRoute>} />
          <Route path="/charts" element={<ProtectedRoute><PlaceholderPage title="Charts" /></ProtectedRoute>} />
          <Route path="/advanced-analytics" element={<ProtectedRoute><PlaceholderPage title="Advanced Analytics" /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><PlaceholderPage title="Gallery" /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><PlaceholderPage title="Reports" /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
