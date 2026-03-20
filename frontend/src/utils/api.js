const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiUpload(path, file, token = null) {
  const formData = new FormData();
  formData.append('image', file);

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: formData, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
