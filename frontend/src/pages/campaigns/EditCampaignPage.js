import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import CampaignForm from './CampaignForm';

export default function EditCampaignPage() {
  const { id } = useParams();
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
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiFetch(`/campaigns/${id}`, {}, token)
      .then((data) => {
        setName(data.name || '');
        setIsLive(data.is_live || false);
        setStartDate(data.start_date || '');
        setEndDate(data.end_date || '');
        setHashtags(data.hashtags || '');
        setBriefLinks(data.brief_links || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          is_live: isLive,
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

  if (fetching) return <AppLayout><p style={{ color: '#7a6f63', fontSize: 14 }}>Loading...</p></AppLayout>;

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
        title="Edit Campaign"
        subtitle="Update your campaign details"
        submitLabel="Save Changes"
        submittingLabel="Saving..."
        onSubmit={handleSubmit}
        onCancel={() => navigate('/campaigns')}
      />
    </AppLayout>
  );
}
