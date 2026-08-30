export const PILOT_TAB_ROUTES = [
  { href: '/today', label: 'Сегодня', name: 'today' },
  { href: '/plan', label: 'План', name: 'plan' },
  { href: '/diary', label: 'Дневник', name: 'diary' },
  { href: '/coach', label: 'Тренер', name: 'coach' },
  { href: '/progress', label: 'Прогресс', name: 'progress' },
] as const;

export const ENERGY_HISTORY_HREF = '/progress?section=energy&date=today' as const;
