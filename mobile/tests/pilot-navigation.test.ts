import { expect, test } from 'bun:test';

import {
  ENERGY_HISTORY_HREF,
  PILOT_TAB_ROUTES,
} from '../src/components/app-tabs.model';

test('pilot navigation exposes exactly the five approved product tabs in order', () => {
  expect(PILOT_TAB_ROUTES).toEqual([
    { href: '/today', label: 'Сегодня', name: 'today' },
    { href: '/plan', label: 'План', name: 'plan' },
    { href: '/diary', label: 'Дневник', name: 'diary' },
    { href: '/coach', label: 'Тренер', name: 'coach' },
    { href: '/progress', label: 'Прогресс', name: 'progress' },
  ]);

  expect(PILOT_TAB_ROUTES.some(({ name }) => name === ('profile' as string))).toBe(false);
});

test('the Today energy card opens the Progress energy calendar for today', () => {
  expect(ENERGY_HISTORY_HREF).toBe('/progress?section=energy&date=today');
});
