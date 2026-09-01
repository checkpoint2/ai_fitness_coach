import { describe, expect, test } from 'bun:test';
import type { DiaryDayConfirmation, DiaryEntry } from '@ai-fitness-coach/contracts';

import {
  calendarDayStatus,
  summarizeProgressDay,
} from '../src/features/progress/day-summary';

describe('summarizeProgressDay', () => {
  test('summarizes only recorded facts and keeps missing values visible', () => {
    const summary = summarizeProgressDay(
      [
        nutritionEntry('known', 450, 'FACT'),
        nutritionEntry('unknown', null, 'FACT'),
        activityEntry('walk', 45, 180),
        activityEntry('strength', null, null),
        measurementEntry(),
      ],
      dayConfirmation(),
    );

    expect(summary).toEqual({
      activityCount: 2,
      activityDurationMinutes: 45,
      activityWithoutCalories: true,
      activityWithoutDuration: true,
      confirmedComplete: true,
      estimatedMetricCount: 1,
      measurementCount: 1,
      nutritionCount: 2,
      nutritionWithoutCalories: true,
      recordedActivityCaloriesKcal: 180,
      recordedIntakeCaloriesKcal: 450,
    });
  });

  test('does not treat an unconfirmed empty day as complete or zero intake', () => {
    expect(summarizeProgressDay([], null)).toEqual({
      activityCount: 0,
      activityDurationMinutes: 0,
      activityWithoutCalories: false,
      activityWithoutDuration: false,
      confirmedComplete: false,
      estimatedMetricCount: 0,
      measurementCount: 0,
      nutritionCount: 0,
      nutritionWithoutCalories: false,
      recordedActivityCaloriesKcal: 0,
      recordedIntakeCaloriesKcal: 0,
    });
  });
});

describe('calendarDayStatus', () => {
  const today = new Date(2026, 7, 30, 12);

  test('marks confirmed days neutrally without inventing an energy result', () => {
    expect(calendarDayStatus(new Date(2026, 7, 29), today, true)).toBe('CONFIRMED_NEUTRAL');
  });

  test('keeps future and incomplete days distinct', () => {
    expect(calendarDayStatus(new Date(2026, 7, 31), today, true)).toBe('FUTURE');
    expect(calendarDayStatus(new Date(2026, 7, 29), today, false)).toBe('UNCONFIRMED');
  });
});

function nutritionEntry(
  id: string,
  caloriesKcal: number | null,
  truthKind: 'FACT' | 'ESTIMATE',
): DiaryEntry {
  const occurredAt = '2026-08-29T09:30:00.000Z';
  return {
    id: uuid(id),
    kind: 'NUTRITION',
    revision: 1,
    description: id,
    occurredAt,
    category: null,
    amountText: null,
    sourceKind: 'STRUCTURED',
    nutrition: caloriesKcal === null
      ? null
      : { caloriesKcal, truthKind },
    confirmedAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function activityEntry(
  id: string,
  durationMinutes: number | null,
  caloriesKcal: number | null,
): DiaryEntry {
  const occurredAt = '2026-08-29T18:30:00.000Z';
  return {
    id: uuid(id),
    kind: 'ACTIVITY',
    revision: 1,
    description: id,
    occurredAt,
    durationMinutes,
    sourceKind: 'STRUCTURED',
    expenditure: caloriesKcal === null
      ? null
      : { caloriesKcal, truthKind: 'ESTIMATE' },
    confirmedAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function measurementEntry(): DiaryEntry {
  const occurredAt = '2026-08-29T08:30:00.000Z';
  return {
    id: uuid('measurement'),
    kind: 'MEASUREMENT',
    revision: 1,
    measurementKind: 'WEIGHT',
    label: null,
    value: 82.4,
    unit: 'KG',
    truthKind: 'FACT',
    occurredAt,
    sourceKind: 'STRUCTURED',
    confirmedAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function dayConfirmation(): DiaryDayConfirmation {
  const timestamp = '2026-08-29T20:00:00.000Z';
  return {
    id: uuid('confirmation'),
    localDate: '2026-08-29',
    timeZone: 'Europe/Moscow',
    revision: 1,
    nutritionComplete: true,
    activityComplete: true,
    confirmedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function uuid(seed: string) {
  return `018fd4f2-1f3a-7c88-bc49-${seed.replace(/[^a-z0-9]/gi, '0').padStart(12, '0').slice(-12)}`;
}
