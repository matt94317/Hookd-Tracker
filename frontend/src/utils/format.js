import { TikTokIcon, InstagramIcon } from '../components/Icons';

export function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

export function formatMetric(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000)    return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function toFixed2(n) {
  return isNaN(n) || !isFinite(n) ? '0.00' : n.toFixed(2);
}

export function getPlatformIcon(platform) {
  if (!platform) return null;
  const lower = platform.toLowerCase();
  if (lower === 'tiktok') return { label: 'TikTok', Icon: TikTokIcon };
  if (lower === 'instagram') return { label: 'Instagram', Icon: InstagramIcon };
  return { label: platform.charAt(0).toUpperCase() + platform.slice(1), Icon: null };
}
