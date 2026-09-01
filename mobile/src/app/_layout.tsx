import { Stack } from 'expo-router';

import { AppProviders } from '@/composition/AppProviders';
import '@/global.css';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
