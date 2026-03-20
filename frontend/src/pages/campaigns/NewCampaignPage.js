import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, apiUpload } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import CampaignForm from './CampaignForm';

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [briefLinks, setBriefLinks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let cover_image_url = null;
      if (coverImage) {
        const uploaded = await apiUpload('/campaigns/upload-image', coverImage, token);
        cover_image_url = uploaded.url;
      }

      await apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          is_live: isLive,
          cover_image_url,
          start_date: startDate || null,
          end_date: endDate || null,
          hashtags: hashtags || null,
          brief_links: briefLinks.filter(Boolean),
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
        isLive={isLive} setIsLive={setIsLive}
        coverImage={coverImage} setCoverImage={setCoverImage}
        startDate={startDate} setStartDate={setStartDate}
        endDate={endDate} setEndDate={setEndDate}
        hashtags={hashtags} setHashtags={setHashtags}
        briefLinks={briefLinks} setBriefLinks={setBriefLinks}
        error={error} loading={loading}
        title="New Campaign"
        subtitle="Set up your campaign details and tracking preferences"
        submitLabel="Create Campaign"
        submittingLabel="Creating..."
        onSubmit={handleSubmit}
        onCancel={() => navigate('/campaigns')}
      />
    </AppLayout>
  );
}
