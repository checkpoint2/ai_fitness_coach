import { ScreenShell, ScreenState, SectionCard } from '@/components/dashboard';
import { TEST_IDS } from '@/constants/testIds';
import { ProfileButton } from '@/features/pilot-shell';

export function ProgressScreen() {
  return (
    <ScreenShell
      actions={<ProfileButton />}
      description="История стратегии, изменений тела и тренировочных результатов."
      eyebrow="AI Fitness Coach"
      testID={TEST_IDS.progress.screen}
      title="Прогресс">
      <SectionCard
        description="Зелёный, жёлтый, красный или серый статус будет объяснять результат каждого дня."
        testID={TEST_IDS.progress.energyCalendar}
        title="Энергетический календарь">
        <ScreenState
          description="Сегодня выбран. После подтверждённых записей здесь появится краткая сводка питания и активности."
          status="empty"
          title="Пока нет завершённых дней"
        />
      </SectionCard>
    </ScreenShell>
  );
}
