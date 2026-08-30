import { PilotPlaceholderScreen } from '@/features/pilot-shell';

export default function DiaryScreen() {
  return (
    <PilotPlaceholderScreen
      description="Еда, активность, тренировки, вес, замеры и заметки в одной хронологии."
      emptyDescription="Здесь появятся только сохранённые и подтверждённые записи — без догадок о том, что вы ели или делали."
      emptyTitle="Записей пока нет"
      title="Дневник"
    />
  );
}
