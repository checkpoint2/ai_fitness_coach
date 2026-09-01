import {
  apiErrorSchema,
  confirmDiaryDayRequestSchema,
  createActivityEntryRequestSchema,
  createNutritionEntryRequestSchema,
  createMeasurementEntryRequestSchema,
  deleteDiaryEntryRequestSchema,
  deleteDiaryEntryResponseSchema,
  diaryEntriesResponseSchema,
  diaryDayConfirmationParamsSchema,
  diaryDayConfirmationResponseSchema,
  diaryDayConfirmationsResponseSchema,
  diaryEntryParamsSchema,
  diaryEntryResponseSchema,
  listDiaryEntriesQuerySchema,
  listDiaryDayConfirmationsQuerySchema,
  updateActivityEntryRequestSchema,
  updateNutritionEntryRequestSchema,
  updateMeasurementEntryRequestSchema,
} from '@ai-fitness-coach/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { DiaryService } from '../application/diary-service'
import { executeDiary } from './errors'

const errorContent = { 'application/json': { schema: apiErrorSchema } }
const bearerSecurity = [{ BearerAuth: [] }]
const entryResponse = {
  200: {
    content: { 'application/json': { schema: diaryEntryResponseSchema } },
    description: 'Confirmed diary entry',
  },
  400: { content: errorContent, description: 'Invalid payload' },
  401: { content: errorContent, description: 'Authentication required' },
  404: { content: errorContent, description: 'Entry not found' },
  409: { content: errorContent, description: 'Revision or idempotency conflict' },
  429: { content: errorContent, description: 'Too many requests' },
} as const

const listRoute = createRoute({
  method: 'get',
  path: '/',
  security: bearerSecurity,
  request: { query: listDiaryEntriesQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: diaryEntriesResponseSchema } },
      description: 'Current user diary entries in reverse chronological order',
    },
    400: { content: errorContent, description: 'Invalid date window' },
    401: { content: errorContent, description: 'Authentication required' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const createNutritionRoute = createRoute({
  method: 'post',
  path: '/nutrition-entries',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: createNutritionEntryRequestSchema } } },
  },
  responses: {
    ...entryResponse,
    201: {
      content: { 'application/json': { schema: diaryEntryResponseSchema } },
      description: 'Confirmed nutrition entry created or safely replayed',
    },
  },
})

const updateNutritionRoute = createRoute({
  method: 'patch',
  path: '/nutrition-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: updateNutritionEntryRequestSchema } } },
  },
  responses: entryResponse,
})

const deleteNutritionRoute = createRoute({
  method: 'delete',
  path: '/nutrition-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: deleteDiaryEntryRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteDiaryEntryResponseSchema } },
      description: 'Nutrition entry deleted; an already absent entry is also success',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Revision conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const createActivityRoute = createRoute({
  method: 'post',
  path: '/activity-entries',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: createActivityEntryRequestSchema } } },
  },
  responses: {
    ...entryResponse,
    201: {
      content: { 'application/json': { schema: diaryEntryResponseSchema } },
      description: 'Confirmed activity entry created or safely replayed',
    },
  },
})

const updateActivityRoute = createRoute({
  method: 'patch',
  path: '/activity-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: updateActivityEntryRequestSchema } } },
  },
  responses: entryResponse,
})

const deleteActivityRoute = createRoute({
  method: 'delete',
  path: '/activity-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: deleteDiaryEntryRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteDiaryEntryResponseSchema } },
      description: 'Activity entry deleted; an already absent entry is also success',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Revision conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const createMeasurementRoute = createRoute({
  method: 'post',
  path: '/measurement-entries',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: createMeasurementEntryRequestSchema } } },
  },
  responses: {
    ...entryResponse,
    201: {
      content: { 'application/json': { schema: diaryEntryResponseSchema } },
      description: 'Confirmed body measurement created or safely replayed',
    },
  },
})

const updateMeasurementRoute = createRoute({
  method: 'patch',
  path: '/measurement-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: updateMeasurementEntryRequestSchema } } },
  },
  responses: entryResponse,
})

const deleteMeasurementRoute = createRoute({
  method: 'delete',
  path: '/measurement-entries/{entryId}',
  security: bearerSecurity,
  request: {
    params: diaryEntryParamsSchema,
    body: { content: { 'application/json': { schema: deleteDiaryEntryRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteDiaryEntryResponseSchema } },
      description: 'Body measurement deleted; an already absent entry is also success',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Revision conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const listDayConfirmationsRoute = createRoute({
  method: 'get',
  path: '/day-confirmations',
  security: bearerSecurity,
  request: { query: listDiaryDayConfirmationsQuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: diaryDayConfirmationsResponseSchema } },
      description: 'Confirmed local diary days for the current user',
    },
    400: { content: errorContent, description: 'Invalid date window' },
    401: { content: errorContent, description: 'Authentication required' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const confirmDayRoute = createRoute({
  method: 'post',
  path: '/day-confirmations',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: confirmDiaryDayRequestSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: diaryDayConfirmationResponseSchema } },
      description: 'Nutrition and activity completeness confirmed for a local day',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Idempotency conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

const deleteDayConfirmationRoute = createRoute({
  method: 'delete',
  path: '/day-confirmations/{localDate}',
  security: bearerSecurity,
  request: {
    params: diaryDayConfirmationParamsSchema,
    body: { content: { 'application/json': { schema: deleteDiaryEntryRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: deleteDiaryEntryResponseSchema } },
      description: 'Day confirmation removed; an already absent confirmation is also success',
    },
    400: { content: errorContent, description: 'Invalid payload' },
    401: { content: errorContent, description: 'Authentication required' },
    409: { content: errorContent, description: 'Revision conflict' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})

type CreateDiaryRoutesOptions = {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: DiaryService
}

export function createDiaryRoutes({ requireAuth, service }: CreateDiaryRoutesOptions) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', requireAuth)

  routes.openapi(listRoute, async (c) => {
    return c.json(await service.list(c.var.user.id, c.req.valid('query')), 200)
  })
  routes.openapi(createNutritionRoute, async (c) => {
    return c.json(
      await executeDiary(() => service.createNutrition(c.var.user.id, c.req.valid('json'))),
      201,
    )
  })
  routes.openapi(updateNutritionRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.updateNutrition(
          c.var.user.id,
          c.req.valid('param').entryId,
          c.req.valid('json'),
        ),
      ),
      200,
    )
  })
  routes.openapi(deleteNutritionRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.deleteNutrition(
          c.var.user.id,
          c.req.valid('param').entryId,
          c.req.valid('json'),
        ),
      ),
      200,
    )
  })
  routes.openapi(createActivityRoute, async (c) => {
    return c.json(
      await executeDiary(() => service.createActivity(c.var.user.id, c.req.valid('json'))),
      201,
    )
  })
  routes.openapi(updateActivityRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.updateActivity(c.var.user.id, c.req.valid('param').entryId, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(deleteActivityRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.deleteActivity(c.var.user.id, c.req.valid('param').entryId, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(createMeasurementRoute, async (c) => {
    return c.json(
      await executeDiary(() => service.createMeasurement(c.var.user.id, c.req.valid('json'))),
      201,
    )
  })
  routes.openapi(updateMeasurementRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.updateMeasurement(c.var.user.id, c.req.valid('param').entryId, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(deleteMeasurementRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.deleteMeasurement(c.var.user.id, c.req.valid('param').entryId, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(listDayConfirmationsRoute, async (c) => {
    return c.json(
      await service.listDayConfirmations(c.var.user.id, c.req.valid('query')),
      200,
    )
  })
  routes.openapi(confirmDayRoute, async (c) => {
    return c.json(
      await executeDiary(() => service.confirmDay(c.var.user.id, c.req.valid('json'))),
      201,
    )
  })
  routes.openapi(deleteDayConfirmationRoute, async (c) => {
    return c.json(
      await executeDiary(() =>
        service.deleteDayConfirmation(
          c.var.user.id,
          c.req.valid('param').localDate,
          c.req.valid('json'),
        ),
      ),
      200,
    )
  })

  return routes
}
