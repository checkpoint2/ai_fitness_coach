import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { accountInitials } from '@/components/dashboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UiPressable } from '@/components/ui/primitives';
import { TEST_IDS } from '@/constants/testIds';
import { useAuth } from '@/features/auth';
import { avatarImageSource, useAvatar } from '@/features/avatar';

export function ProfileButton() {
  const auth = useAuth();
  const avatar = useAvatar();
  const router = useRouter();
  const avatarImage = useMemo(
    () => avatarImageSource(avatar.avatar, Platform.OS),
    [avatar.avatar],
  );

  if (!auth.user) return null;

  return (
    <UiPressable
      accessibilityLabel="Открыть профиль"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.push('/profile')}
      testID={TEST_IDS.profile.openButton}>
      <Avatar>
        <AvatarFallback>
          {accountInitials(auth.user.displayName, auth.user.email)}
        </AvatarFallback>
        {avatarImage ? (
          <AvatarImage
            accessible={false}
            accessibilityLabel=""
            cachePolicy="memory-disk"
            contentFit="cover"
            source={avatarImage}
            transition={120}
          />
        ) : null}
      </Avatar>
    </UiPressable>
  );
}
