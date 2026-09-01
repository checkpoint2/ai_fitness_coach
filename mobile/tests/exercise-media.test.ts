import { expect, test } from 'bun:test';

import {
  EXERCISE_MEDIA_ASPECT_RATIO,
  exerciseMediaLayers,
} from '../src/features/training/exercise-media';

test('exercise media uses the approved portrait asset ratio', () => {
  expect(EXERCISE_MEDIA_ASPECT_RATIO).toBeCloseTo(864 / 1821, 6);
});

test('exercise media shows only the poster before playback starts', () => {
  expect(exerciseMediaLayers(false, false)).toEqual({
    showPoster: true,
    showVideo: false,
  });
});

test('exercise media replaces the poster with video during playback', () => {
  expect(exerciseMediaLayers(true, false)).toEqual({
    showPoster: false,
    showVideo: true,
  });
});

test('exercise media falls back to only the poster after a video error', () => {
  expect(exerciseMediaLayers(true, true)).toEqual({
    showPoster: true,
    showVideo: false,
  });
});
