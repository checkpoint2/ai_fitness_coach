import { ScreenShell, ScreenState } from '@/components/dashboard';
import { ProfileButton } from '../components/ProfileButton';

type PilotPlaceholderScreenProps = {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  title: string;
};

export function PilotPlaceholderScreen({
  description,
  emptyDescription,
  emptyTitle,
  title,
}: PilotPlaceholderScreenProps) {
  return (
    <ScreenShell
      actions={<ProfileButton />}
      description={description}
      eyebrow="AI Fitness Coach"
      title={title}>
      <ScreenState
        description={emptyDescription}
        status="empty"
        title={emptyTitle}
      />
    </ScreenShell>
  );
}
