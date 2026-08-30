import { Redirect, type Href } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { ScreenLoader } from '@/components/screen-states';
import { Button } from '@/components/ui/button';
import { ScreenShell, ScreenState } from '@/components/dashboard';
import { useAuth } from '@/features/auth';
import { useOnboarding } from '@/features/onboarding';

export default function TabsLayout() {
  const auth = useAuth();
  const onboarding = useOnboarding();

  if (auth.isBootstrapping) {
    return <ScreenLoader />;
  }

  if (!auth.user) {
    return <Redirect href="/" />;
  }

  if (onboarding.isLoading || (!onboarding.snapshot && !onboarding.error)) {
    return <ScreenLoader />;
  }

  if (!onboarding.snapshot) {
    return (
      <ScreenShell centered eyebrow="Первый запуск" title="Не удалось проверить настройку">
        <ScreenState
          action={<Button onPress={() => void onboarding.retry()}>Повторить</Button>}
          description={onboarding.error ?? 'Проверьте соединение и повторите.'}
          status="error"
        />
      </ScreenShell>
    );
  }

  if (
    onboarding.snapshot.status !== 'COMPLETED' &&
    onboarding.snapshot.status !== 'PLAN_CONFIRMED'
  ) {
    return <Redirect href={'/onboarding' as Href} />;
  }

  return <AppTabs />;
}
