import {
  apiErrorSchema,
  createWorkoutSessionRequestSchema,
  deleteWorkoutSessionRequestSchema,
  deleteWorkoutSessionResponseSchema,
  exerciseCatalogResponseSchema,
  listWorkoutSessionsQuerySchema,
  updateWorkoutSessionRequestSchema,
  workoutSessionParamsSchema,
  workoutSessionResponseSchema,
  workoutSessionsResponseSchema,
} from '@ai-fitness-coach/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { TrainingService } from '../application/training-service'
import { executeTraining } from './errors'

const errorContent = { 'application/json': { schema: apiErrorSchema } }
const security = [{ BearerAuth: [] }]
const commonErrors = {
  400: { content: errorContent, description: 'Invalid payload' },
  401: { content: errorContent, description: 'Authentication required' },
  404: { content: errorContent, description: 'Workout not found' },
  409: { content: errorContent, description: 'Revision or idempotency conflict' },
  429: { content: errorContent, description: 'Too many requests' },
} as const

const listRoute = createRoute({
  method: 'get', path: '/sessions', security,
  request: { query: listWorkoutSessionsQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: workoutSessionsResponseSchema } }, description: 'Current user workout history' },
    ...commonErrors,
  },
})
const listCatalogRoute = createRoute({
  method: 'get', path: '/exercises', security,
  responses: {
    200: { content: { 'application/json': { schema: exerciseCatalogResponseSchema } }, description: 'Reviewed active exercise catalog' },
    401: { content: errorContent, description: 'Authentication required' },
    429: { content: errorContent, description: 'Too many requests' },
  },
})
const createRouteDefinition = createRoute({
  method: 'post', path: '/sessions', security,
  request: { body: { content: { 'application/json': { schema: createWorkoutSessionRequestSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: workoutSessionResponseSchema } }, description: 'Confirmed workout created or replayed' },
    ...commonErrors,
  },
})
const updateRoute = createRoute({
  method: 'patch', path: '/sessions/{sessionId}', security,
  request: {
    params: workoutSessionParamsSchema,
    body: { content: { 'application/json': { schema: updateWorkoutSessionRequestSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: workoutSessionResponseSchema } }, description: 'Corrected workout' },
    ...commonErrors,
  },
})
const deleteRoute = createRoute({
  method: 'delete', path: '/sessions/{sessionId}', security,
  request: {
    params: workoutSessionParamsSchema,
    body: { content: { 'application/json': { schema: deleteWorkoutSessionRequestSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: deleteWorkoutSessionResponseSchema } }, description: 'Workout deleted or already absent' },
    ...commonErrors,
  },
})

export function createTrainingRoutes(options: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: TrainingService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', options.requireAuth)
  routes.openapi(listCatalogRoute, async (c) => c.json(await options.service.listCatalog(), 200))
  routes.openapi(listRoute, async (c) => c.json(
    await options.service.list(c.var.user.id, c.req.valid('query')), 200,
  ))
  routes.openapi(createRouteDefinition, async (c) => c.json(
    await executeTraining(() => options.service.create(c.var.user.id, c.req.valid('json'))), 201,
  ))
  routes.openapi(updateRoute, async (c) => c.json(
    await executeTraining(() => options.service.update(
      c.var.user.id, c.req.valid('param').sessionId, c.req.valid('json'),
    )), 200,
  ))
  routes.openapi(deleteRoute, async (c) => c.json(
    await executeTraining(() => options.service.delete(
      c.var.user.id, c.req.valid('param').sessionId, c.req.valid('json'),
    )), 200,
  ))
  return routes
}
