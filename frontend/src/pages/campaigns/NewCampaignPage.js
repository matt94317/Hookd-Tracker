import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import CampaignForm from './CampaignForm';

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      }, token);
      navigate('/campaigns');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <CampaignForm
        name={name} setName={setName}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        error={error} loading={loading}
        title="Everything you need for a successful UGC campaign"
        subtitle="Set up your campaign details and tracking preferences"
        submitLabel="Create Campaign"
        submittingLabel="Creating..."
        onSubmit={handleSubmit}
        onCancel={() => navigate('/campaigns')}
      />
    </AppLayout>
  );
}
