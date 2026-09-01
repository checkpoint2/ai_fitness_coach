import { describe, expect, test } from 'bun:test';

import { parseWorkoutDraft } from '../src/features/training/workout-draft';

const valid = {
  title: ' Силовая A ',
  durationMinutes: '55',
  effort: 'RIGHT' as const,
  notes: '',
  exercises: [{
    key: 'exercise',
    name: ' Присед с гантелью ',
    equipmentText: ' Гантель ',
    notes: '',
    sets: [{ key: 'set', reps: '10', loadKg: '16,5', durationSeconds: '' }],
  }],
};

describe('parseWorkoutDraft', () => {
  test('keeps only explicit completed-set values and normalizes decimal commas', () => {
    expect(parseWorkoutDraft(valid)).toEqual({
      ok: true,
      value: {
        title: 'Силовая A',
        durationMinutes: 55,
        effort: 'RIGHT',
        notes: null,
        exercises: [{
          name: 'Присед с гантелью',
          equipmentText: 'Гантель',
          notes: null,
          sets: [{ reps: 10, loadKg: 16.5, durationSeconds: null, completed: true }],
        }],
      },
    });
  });

  test('rejects empty sets and zero reps instead of inventing completion data', () => {
    expect(parseWorkoutDraft({
      ...valid,
      exercises: [{ ...valid.exercises[0], sets: [{ key: 'empty', reps: '', loadKg: '', durationSeconds: '' }] }],
    })).toMatchObject({ ok: false });
    expect(parseWorkoutDraft({
      ...valid,
      exercises: [{ ...valid.exercises[0], sets: [{ key: 'zero', reps: '0', loadKg: '', durationSeconds: '' }] }],
    })).toMatchObject({ ok: false });
  });

  test('requires at least one exercise with at least one set', () => {
    expect(parseWorkoutDraft({ ...valid, exercises: [] })).toMatchObject({ ok: false });
    expect(parseWorkoutDraft({
      ...valid,
      exercises: [{ ...valid.exercises[0], sets: [] }],
    })).toMatchObject({ ok: false });
  });
});
