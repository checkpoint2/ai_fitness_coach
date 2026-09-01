import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenShell, SectionCard } from '@/components/dashboard';
import { ENERGY_HISTORY_HREF } from '@/components/app-tabs.model';
import { Button } from '@/components/ui/button';
import { Surface, UiPressable } from '@/components/ui/primitives';
import { useUiTheme } from '@/components/ui/theme';
import { Typography } from '@/components/ui/typography';
import { TEST_IDS } from '@/constants/testIds';
import { useAuth } from '@/features/auth';
import { useDiary } from '@/features/diary';
import { useOnboarding } from '@/features/onboarding';
import { ProfileButton } from '@/features/pilot-shell';
import { useTraining } from '@/features/training';
import { summarizeRecordedIntake } from '../day-intake';

export function TodayScreen() {
  const auth = useAuth();
  const diary = useDiary();
  const onboarding = useOnboarding();
  const router = useRouter();
  const theme = useUiTheme();
  const training = useTraining();
  const firstName = auth.user?.displayName?.trim().split(/\s+/)[0];
  const intake = summarizeRecordedIntake(diary.entries);
  const completionStartedForRevision = useRef<number | null>(null);
  const todayTraining = training.sessions.filter((session) => isToday(session.occurredAt));

  useEffect(() => {
    const snapshot = onboarding.snapshot;
    if (
      snapshot?.status !== 'PLAN_CONFIRMED' ||
      completionStartedForRevision.current === snapshot.revision
    ) {
      return;
    }
    completionStartedForRevision.current = snapshot.revision;
    void onboarding.complete();
  }, [onboarding]);

  return (
    <ScreenShell
      actions={<ProfileButton />}
      description="Без гонки и чувства вины — разберёмся с одним полезным шагом за раз."
      eyebrow={formatToday()}
      testID={TEST_IDS.today.screen}
      title={firstName ? `Привет, ${firstName}!` : 'Привет!'}>
      {onboarding.snapshot?.status === 'PLAN_CONFIRMED' ? (
        <SectionCard title="Сохраняем завершение настройки">
          <Typography variant="bodySm" muted>
            Экран «Сегодня» уже открыт. Отметим onboarding завершённым только после ответа backend.
          </Typography>
          {onboarding.error ? (
            <Button onPress={() => void onboarding.retry()} variant="outline">
              Повторить завершение
            </Button>
          ) : null}
        </SectionCard>
      ) : null}
      <UiPressable
        accessibilityHint="Открывает энергетический календарь в разделе Прогресс"
        accessibilityLabel="Энергетический баланс. Данных пока недостаточно"
        accessibilityRole="button"
        onPress={() => router.push(ENERGY_HISTORY_HREF as Href)}
        testID={TEST_IDS.today.energyCard}>
        <Surface
          bordered
          padded="lg"
          rounded="xxl"
          style={[styles.energyCard, { gap: theme.spacing.lg }]}>
          <View style={[styles.row, { gap: theme.spacing.md }]}>
            <View style={[styles.copy, { gap: theme.spacing.xxs }]}>
              <Typography variant="body" weight="700">
                Энергетический баланс
              </Typography>
              <Typography variant="caption" muted>
                {diary.dayConfirmation
                  ? 'Данные за день подтверждены · энергетический результат ещё не рассчитан'
                  : diary.entries.length === 0
                    ? 'Предварительно · данных пока мало'
                    : 'Предварительно · полный расход и дневная цель ещё не рассчитаны'}
              </Typography>
            </View>
            <Surface padded="sm" rounded="full" tone="muted">
              <Typography variant="caption" weight="700">
                Серый день
              </Typography>
            </Surface>
          </View>

          <View style={[styles.metrics, { gap: theme.spacing.md }]}>
            <EnergyMetric
              label="Получено"
              value={intake.recordedCaloriesKcal > 0
                ? `${intake.recordedCaloriesKcal} ккал${intake.hasNutritionWithoutCalories ? '+' : ''}`
                : '— ккал'}
            />
            <EnergyMetric label="Расход" value="не рассчитан" />
            <EnergyMetric label="Баланс" value="— ккал" />
          </View>

          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <Typography style={styles.copy} variant="bodySm" muted>
              {diary.dayConfirmation
                ? 'Полнота отмечена. Цвет останется серым, пока нет подтверждённой цели и полного расхода.'
                : diary.entries.length === 0
                  ? 'Добавьте подтверждённые записи, чтобы начать собирать результат дня.'
                  : 'Записи учтены. Цвет останется серым, пока нет подтверждённой цели и полного расхода.'}
            </Typography>
            <View style={[styles.row, { gap: theme.spacing.xs }]}>
              <Typography variant="bodySm" weight="700">
                Календарь
              </Typography>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={16}
                tintColor={theme.colors.foreground}
              />
            </View>
          </View>
        </Surface>
      </UiPressable>

      <SectionCard
        description="Питание и активность сохраняются в постоянной истории и доступны после нового входа."
        title="Главное сейчас">
        <Typography variant="bodyLg" weight="700">
          Записать сегодняшний день
        </Typography>
        <Button onPress={() => router.push('/diary')}>Открыть дневник</Button>
      </SectionCard>

      <SectionCard
        description="Здесь появятся питание, тренировка, восстановление и другие подтверждённые действия."
        title="План дня">
        {todayTraining.length > 0 ? (
          <>
            <Typography variant="bodyLg" weight="700">Тренировка зафиксирована</Typography>
            {todayTraining.map((session) => (
              <Typography key={session.id} variant="bodySm" muted>
                {session.title} · {session.exercises.length} упр.
              </Typography>
            ))}
          </>
        ) : (
          <Typography variant="bodySm" muted>
            Подтверждённой тренировки на сегодня пока нет. Конкретный план не назначается до проверки библиотеки упражнений.
          </Typography>
        )}
        <Button variant="outline" onPress={() => router.push('/plan')}>Открыть тренировки</Button>
      </SectionCard>

      <SectionCard title="Быстрое добавление">
        <View style={[styles.quickActions, { gap: theme.spacing.sm }]}>
          <Button variant="outline" style={styles.quickAction} onPress={() => router.push('/diary')}>Еда</Button>
          <Button variant="outline" style={styles.quickAction} onPress={() => router.push('/diary')}>Активность</Button>
          <Button variant="outline" style={styles.quickAction} onPress={() => router.push('/diary')}>Вес и замеры</Button>
          <Button variant="outline" style={styles.quickAction} onPress={() => router.push('/plan')}>Тренировка</Button>
          <Button disabled variant="outline" style={styles.quickAction}>Вопрос тренеру</Button>
        </View>
      </SectionCard>
    </ScreenShell>
  );
}

function EnergyMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Typography variant="caption" muted>{label}</Typography>
      <Typography variant="body" weight="700">{value}</Typography>
    </View>
  );
}

function formatToday() {
  const value = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    minWidth: 0,
  },
  energyCard: {
    overflow: 'hidden',
  },
  metric: {
    flex: 1,
    gap: 4,
    minWidth: 88,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickAction: {
    flexGrow: 1,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
