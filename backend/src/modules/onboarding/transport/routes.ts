import {
  apiErrorSchema,
  confirmOnboardingProfileRequestSchema,
  confirmOnboardingPlanRequestSchema,
  onboardingMutationRequestSchema,
  onboardingSnapshotSchema,
  saveOnboardingDraftRequestSchema,
} from '@ai-fitness-coach/contracts'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import { validationErrorHook } from '../../../http/errors'
import type { AuthHttpEnv } from '../../auth'
import type { OnboardingService } from '../application/onboarding-service'
import { executeOnboarding } from './errors'

const errorContent = { 'application/json': { schema: apiErrorSchema } }
const bearerSecurity = [{ BearerAuth: [] }]
const snapshotResponse = {
  content: { 'application/json': { schema: onboardingSnapshotSchema } },
  description: 'Current user onboarding snapshot',
}
const commonErrors = {
  400: { content: errorContent, description: 'Invalid payload' },
  401: { content: errorContent, description: 'Authentication required' },
  409: { content: errorContent, description: 'Revision or idempotency conflict' },
  422: { content: errorContent, description: 'Invalid onboarding transition or incomplete data' },
}

const getSnapshotRoute = createRoute({
  method: 'get',
  path: '/',
  security: bearerSecurity,
  responses: { 200: snapshotResponse, 401: commonErrors[401] },
})

const saveDraftRoute = createRoute({
  method: 'put',
  path: '/draft',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: saveOnboardingDraftRequestSchema } } },
  },
  responses: { 200: snapshotResponse, ...commonErrors },
})

function mutationRoute(path: '/pause' | '/resume') {
  return createRoute({
    method: 'post',
    path,
    security: bearerSecurity,
    request: {
      body: { content: { 'application/json': { schema: onboardingMutationRequestSchema } } },
    },
    responses: { 200: snapshotResponse, ...commonErrors },
  })
}

const pauseRoute = mutationRoute('/pause')
const resumeRoute = mutationRoute('/resume')
const confirmProfileRoute = createRoute({
  method: 'post',
  path: '/profile-confirmation',
  security: bearerSecurity,
  request: {
    body: {
      content: { 'application/json': { schema: confirmOnboardingProfileRequestSchema } },
    },
  },
  responses: { 200: snapshotResponse, ...commonErrors },
})

const createPlanDraftRoute = createRoute({
  method: 'post',
  path: '/plan-draft',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: onboardingMutationRequestSchema } } },
  },
  responses: { 200: snapshotResponse, ...commonErrors },
})
const confirmPlanRoute = createRoute({
  method: 'post',
  path: '/plan-confirmation',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: confirmOnboardingPlanRequestSchema } } },
  },
  responses: { 200: snapshotResponse, ...commonErrors },
})
const completeRoute = createRoute({
  method: 'post',
  path: '/complete',
  security: bearerSecurity,
  request: {
    body: { content: { 'application/json': { schema: onboardingMutationRequestSchema } } },
  },
  responses: { 200: snapshotResponse, ...commonErrors },
})

type CreateOnboardingRoutesOptions = {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: OnboardingService
}

export function createOnboardingRoutes({
  requireAuth,
  service,
}: CreateOnboardingRoutesOptions) {
  const routes = new OpenAPIHono<AuthHttpEnv>({ defaultHook: validationErrorHook })
  routes.use('*', requireAuth)

  routes.openapi(getSnapshotRoute, async (c) => {
    return c.json(await service.getSnapshot(c.var.user.id), 200)
  })
  routes.openapi(saveDraftRoute, async (c) => {
    return c.json(
      await executeOnboarding(() => service.saveDraft(c.var.user.id, c.req.valid('json'))),
      200,
    )
  })
  routes.openapi(pauseRoute, async (c) => {
    return c.json(
      await executeOnboarding(() => service.pause(c.var.user.id, c.req.valid('json'))),
      200,
    )
  })
  routes.openapi(resumeRoute, async (c) => {
    return c.json(
      await executeOnboarding(() => service.resume(c.var.user.id, c.req.valid('json'))),
      200,
    )
  })
  routes.openapi(confirmProfileRoute, async (c) => {
    return c.json(
      await executeOnboarding(() =>
        service.confirmProfile(c.var.user.id, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(createPlanDraftRoute, async (c) => {
    return c.json(
      await executeOnboarding(() =>
        service.createPlanDraft(c.var.user.id, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(confirmPlanRoute, async (c) => {
    return c.json(
      await executeOnboarding(() =>
        service.confirmPlan(c.var.user.id, c.req.valid('json')),
      ),
      200,
    )
  })
  routes.openapi(completeRoute, async (c) => {
    return c.json(
      await executeOnboarding(() => service.complete(c.var.user.id, c.req.valid('json'))),
      200,
    )
  })
  return routes
}
