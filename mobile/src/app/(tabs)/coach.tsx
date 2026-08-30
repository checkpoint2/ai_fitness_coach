import { PilotPlaceholderScreen } from '@/features/pilot-shell';

export default function CoachScreen() {
  return (
    <PilotPlaceholderScreen
      description="Полноценный чат с тренером: текст, голос и контекст только из ваших данных."
      emptyDescription="Тренер появится после настройки безопасного AI-контура. Сохранённые планы и дневник не будут зависеть от доступности AI."
      emptyTitle="Тренер пока не подключён"
      title="Тренер"
    />
  );
}
