import { describe, expect, test } from 'bun:test';
import type { DiaryEntry } from '@ai-fitness-coach/contracts';

import { summarizeRecordedIntake } from '../src/features/today/day-intake';

describe('summarizeRecordedIntake', () => {
  test('sums only explicitly recorded calories', () => {
    expect(summarizeRecordedIntake([
      nutritionEntry('first', 320),
      nutritionEntry('second', 180),
      activityEntry(),
    ])).toEqual({
      recordedCaloriesKcal: 500,
      hasNutritionWithoutCalories: false,
      nutritionEntryCount: 2,
    });
  });

  test('keeps incomplete nutrition visible instead of treating it as zero', () => {
    expect(summarizeRecordedIntake([
      nutritionEntry('known', 250),
      nutritionEntry('unknown', null),
    ])).toEqual({
      recordedCaloriesKcal: 250,
      hasNutritionWithoutCalories: true,
      nutritionEntryCount: 2,
    });
  });
});

function nutritionEntry(id: string, caloriesKcal: number | null): DiaryEntry {
  const occurredAt = '2026-08-30T09:30:00.000Z';
  return {
    id: `018fd4f2-1f3a-7c88-bc49-${id.padStart(12, '0')}`,
    kind: 'NUTRITION',
    revision: 1,
    description: id,
    occurredAt,
    category: null,
    amountText: null,
    sourceKind: 'STRUCTURED',
    nutrition: caloriesKcal === null
      ? null
      : {
          caloriesKcal,
          proteinGrams: null,
          fatGrams: null,
          carbohydrateGrams: null,
          truthKind: 'FACT',
        },
    confirmedAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

function activityEntry(): DiaryEntry {
  const occurredAt = '2026-08-30T10:30:00.000Z';
  return {
    id: '018fd4f2-1f3a-7c88-bc49-999999999999',
    kind: 'ACTIVITY',
    revision: 1,
    description: 'Прогулка',
    occurredAt,
    durationMinutes: 30,
    sourceKind: 'STRUCTURED',
    expenditure: { caloriesKcal: 120, truthKind: 'ESTIMATE' },
    confirmedAt: occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}
