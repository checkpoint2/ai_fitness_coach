import { expect, test } from 'bun:test';

import {
  buildManualOnboardingPatch,
  emptyManualOnboardingValues,
  manualOnboardingValuesFromPatch,
} from '../src/features/onboarding/manual-draft';

function completeValues() {
  return {
    ...emptyManualOnboardingValues('Europe/Moscow'),
    adultConfirmed: true,
    birthYearAnswer: 'DECLINED' as const,
    calculationSexAnswer: 'DECLINED' as const,
    heightCm: '180',
    currentWeightKg: '82.5',
    bodyGoal: 'RECOMPOSITION' as const,
    trainingGoal: 'STRENGTH' as const,
    trainingExperience: 'Тренируюсь около года',
    trainingAtHome: true,
    equipment: 'гантели, резинки',
    trainingDaysPerWeek: '3',
    workoutDurationMinutes: '60',
    ordinaryDayDescription: 'В основном сижу за компьютером',
    allergiesAnswer: 'NONE' as const,
    nutritionTrackingMode: 'HYBRID' as const,
    currentPainOrInjury: 'NO' as const,
    doctorRestriction: 'NO' as const,
    ordinaryFitnessSuitabilityDoubt: 'NO' as const,
    supervisedNutritionOrActivityOnly: 'NO' as const,
  };
}

test('manual onboarding builds only explicit structured draft facts', () => {
  const result = buildManualOnboardingPatch(completeValues());

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.patch.birthYear?.value).toEqual({ kind: 'DECLINED' });
  expect(result.patch.calculationSex?.value).toEqual({ kind: 'DECLINED' });
  expect(result.patch.trainingLocations?.value).toEqual(['HOME']);
  expect(result.patch.equipment?.value).toEqual(['гантели', 'резинки']);
  expect(result.patch.allergiesAndExclusions?.value).toEqual({ kind: 'NONE' });
  expect(Object.values(result.patch).every((field) => field?.sourceKind === 'STRUCTURED')).toBe(true);
});

test('manual onboarding refuses missing safety answers and conditional equipment context', () => {
  const values = completeValues();
  values.currentPainOrInjury = '';
  values.equipment = '';

  const result = buildManualOnboardingPatch(values);

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.errors).toContain('Ответьте на все четыре вопроса об ограничениях');
  expect(result.errors).toContain('Укажите доступный инвентарь или напишите «без инвентаря»');
});

test('manual onboarding accepts an explicit birth year and calculation parameter without inference', () => {
  const values = completeValues();
  values.birthYearAnswer = 'VALUE';
  values.birthYear = '1992';
  values.calculationSexAnswer = 'FEMALE';

  const result = buildManualOnboardingPatch(values);

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.patch.birthYear?.value).toEqual({ kind: 'VALUE', year: 1992 });
  expect(result.patch.calculationSex?.value).toEqual({ kind: 'VALUE', value: 'FEMALE' });
});

test('manual onboarding restores the server draft without inventing missing values', () => {
  const built = buildManualOnboardingPatch(completeValues());
  expect(built.ok).toBe(true);
  if (!built.ok) return;

  const restored = manualOnboardingValuesFromPatch(built.patch, 'UTC');

  expect(restored.birthYearAnswer).toBe('DECLINED');
  expect(restored.calculationSexAnswer).toBe('DECLINED');
  expect(restored.timezone).toBe('Europe/Moscow');
  expect(restored.trainingAtHome).toBe(true);
  expect(restored.trainingAtGym).toBe(false);
  expect(restored.equipment).toBe('гантели, резинки');
  expect(restored.allergiesAnswer).toBe('NONE');
  expect(restored.allergiesText).toBe('');
});
