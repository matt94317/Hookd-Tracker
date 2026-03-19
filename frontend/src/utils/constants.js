export const TIME_PERIODS = [
  { label: 'Last 7 Days',    days: 7 },
  { label: 'Last 30 Days',   days: 30 },
  { label: 'Last 90 Days',   days: 90 },
  { label: 'Last 12 Months', days: 365 },
  { label: 'All Time',       days: null },
];

export const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$150',
    period: '/mo',
    features: ['5 creators', '3 campaigns', 'Basic analytics'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$270',
    period: '/mo',
    features: ['20 creators', '10 campaigns', 'Advanced analytics', 'Priority support'],
  },
];
