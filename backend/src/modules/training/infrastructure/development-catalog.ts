import type { DbClient } from '../../../db'

const approvedPilotExercises = [
  {
    slug: 'bodyweight-squat',
    contentVersion: 1,
    activeKey: 'bodyweight-squat',
    status: 'active' as const,
    name: 'Приседание с собственным весом',
    environments: ['HOME_NO_EQUIPMENT', 'ANYWHERE'],
    equipment: [],
    instructions:
      'Примите устойчивую удобную стойку. Сгибайте тазобедренные и коленные суставы одновременно, сохраняя стопы на полу. Опускайтесь до глубины, на которой контролируете движение, затем надавите стопами в пол и встаньте.',
    techniqueCues: [
      'Сохраняйте опору на всю стопу',
      'Направляйте колени вслед за носками',
      'Выбирайте глубину, на которой сохраняете контроль',
      'Держите корпус устойчивым',
    ],
    commonMistakes: [
      'Отрыв пяток от пола',
      'Завал коленей внутрь',
      'Потеря равновесия',
      'Продолжение движения после потери контроля',
    ],
    demonstrationKind: 'short_video' as const,
    demonstrationAssetKey: 'exercise/bodyweight-squat/v1',
    demonstrationAltText:
      'Спортсмен сбоку выполняет одно контролируемое приседание с собственным весом.',
    reviewReference: 'owner-review-bodyweight-squat-2026-08-31',
    reviewedAt: new Date('2026-08-31T17:00:00.000Z'),
  },
]

export async function seedApprovedPilotExerciseCatalog(db: DbClient) {
  for (const exercise of approvedPilotExercises) {
    await db.exerciseDefinition.upsert({
      where: {
        slug_contentVersion: {
          slug: exercise.slug,
          contentVersion: exercise.contentVersion,
        },
      },
      create: exercise,
      update: exercise,
    })
  }
}
