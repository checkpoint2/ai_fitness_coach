/**
 * Approved squat poster: 864 x 1821. The approved video uses the same portrait framing.
 * Keeping the container at this ratio avoids both cropping and letterboxing.
 */
export const EXERCISE_MEDIA_ASPECT_RATIO = 864 / 1821;

export function exerciseMediaLayers(hasStarted: boolean, loadFailed: boolean) {
  return {
    showPoster: !hasStarted || loadFailed,
    showVideo: hasStarted && !loadFailed,
  };
}
