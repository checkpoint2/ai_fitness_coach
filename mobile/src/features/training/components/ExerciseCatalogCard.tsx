import type { ExerciseCatalogItem, ExerciseEnvironment } from '@ai-fitness-coach/contracts';
import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUiTheme, withAlpha } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import { EXERCISE_MEDIA_ASPECT_RATIO, exerciseMediaLayers } from '../exercise-media';

const approvedMedia = {
  'exercise/bodyweight-squat/v1': {
    poster: require('../../../../assets/exercises/v1/posters/bodyweight-squat.png'),
    video: require('../../../../assets/exercises/v1/videos/bodyweight-squat.mp4'),
  },
} as const;

type ApprovedMediaKey = keyof typeof approvedMedia;

export function ExerciseCatalogCard({ exercise }: { exercise: ExerciseCatalogItem }) {
  const theme = useUiTheme();
  const media = isApprovedMediaKey(exercise.demonstration.assetKey)
    ? approvedMedia[exercise.demonstration.assetKey]
    : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.muted,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
        },
      ]}
      testID={TEST_IDS.training.catalogCard}>
      <View style={{ gap: theme.spacing.xs }}>
        <Typography variant="h6">{exercise.name}</Typography>
        <Typography variant="caption" muted>
          {environmentLabel(exercise.environments)} · {equipmentLabel(exercise.equipment)}
        </Typography>
      </View>

      {media ? (
        <ExerciseVideo
          altText={exercise.demonstration.altText}
          poster={media.poster}
          source={media.video}
        />
      ) : (
        <Alert>
          <AlertDescription>
            Демонстрация этой версии пока недоступна на устройстве. Используйте только текстовую инструкцию.
          </AlertDescription>
        </Alert>
      )}

      <View style={{ gap: theme.spacing.sm }}>
        <Typography variant="label">Как выполнять</Typography>
        <Typography variant="bodySm">{exercise.instructions}</Typography>
      </View>

      <Separator />

      <View style={{ gap: theme.spacing.sm }}>
        <Typography variant="label">На что обратить внимание</Typography>
        {exercise.techniqueCues.map((cue) => (
          <Typography key={cue} variant="bodySm" muted>• {cue}</Typography>
        ))}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Typography variant="label">Частые ошибки</Typography>
        {exercise.commonMistakes.map((mistake) => (
          <Typography key={mistake} variant="bodySm" muted>• {mistake}</Typography>
        ))}
      </View>

      <Alert>
        <AlertDescription>
          Остановитесь, если движение вызывает боль или вы теряете устойчивость. Карточка не является медицинским допуском.
        </AlertDescription>
      </Alert>

      <Typography variant="caption" muted>
        Версия {exercise.contentVersion} · демонстрация утверждена владельцем и тренером
      </Typography>
    </View>
  );
}

function ExerciseVideo({ altText, poster, source }: {
  altText: string;
  poster: number;
  source: number;
}) {
  const theme = useUiTheme();
  const [hasStarted, setHasStarted] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') setLoadFailed(true);
    if (status === 'readyToPlay') setLoadFailed(false);
  });

  useEffect(() => {
    if (hasStarted && !loadFailed) player.play();
  }, [hasStarted, loadFailed, player]);

  const layers = exerciseMediaLayers(hasStarted, loadFailed);

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (!hasStarted) {
      setHasStarted(true);
      return;
    }
    player.play();
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        accessibilityLabel={altText}
        style={[
          styles.media,
          {
            backgroundColor: withAlpha(theme.colors.foreground, 0.08),
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
          },
        ]}>
        {layers.showVideo ? (
          <VideoView
            allowsVideoFrameAnalysis={false}
            contentFit="contain"
            nativeControls={false}
            player={player}
            playsInline
            style={styles.mediaFill}
            surfaceType="textureView"
            testID={TEST_IDS.training.video}
          />
        ) : null}
        {layers.showPoster ? (
          <Image
            accessibilityLabel={altText}
            contentFit="contain"
            source={poster}
            style={styles.mediaFill}
          />
        ) : null}
      </View>

      {loadFailed ? (
        <Typography variant="caption" muted>
          Видео не загрузилось. Стартовый кадр и текстовая техника остаются доступны.
        </Typography>
      ) : (
        <Button
          accessibilityLabel={isPlaying ? 'Остановить демонстрацию' : 'Показать технику упражнения'}
          testID={TEST_IDS.training.videoToggle}
          variant="outline"
          onPress={togglePlayback}>
          {isPlaying ? 'Пауза' : hasStarted ? 'Продолжить демонстрацию' : 'Показать технику'}
        </Button>
      )}
      <Typography variant="caption" muted>
        Без звука · повторяется автоматически
      </Typography>
    </View>
  );
}

function isApprovedMediaKey(value: string): value is ApprovedMediaKey {
  return value in approvedMedia;
}

function environmentLabel(environments: ExerciseEnvironment[]) {
  const labels: Record<ExerciseEnvironment, string> = {
    HOME_NO_EQUIPMENT: 'дома',
    HOME_EQUIPMENT: 'дома с инвентарём',
    GYM_MACHINE: 'в зале на тренажёре',
    GYM_FREE_WEIGHT: 'в зале со свободным весом',
    ANYWHERE: 'в удобном месте',
  };
  return [...new Set(environments.map((environment) => labels[environment]))].join(' / ');
}

function equipmentLabel(equipment: string[]) {
  return equipment.length === 0 ? 'без инвентаря' : equipment.join(', ');
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  media: {
    aspectRatio: EXERCISE_MEDIA_ASPECT_RATIO,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mediaFill: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
});
