import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { validateRequestBody, createErrorResponse } from '@/lib/api-helpers'
import { z } from 'zod'
import { spotMeSettings } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

const UpdateSettingsSchema = z.object({
  max_walk_minutes: z.number().int().min(5, 'Minimum walk time is 5 minutes').max(30, 'Maximum walk time is 30 minutes').optional(),
  onboarding_completed: z.boolean().optional(),
}).strict()

export async function GET(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const rows = await withRLS((db) =>
      db.select({
        googleEmail: spotMeSettings.googleEmail,
        maxWalkMinutes: spotMeSettings.maxWalkMinutes,
        onboardingCompleted: spotMeSettings.onboardingCompleted,
        hasAccessToken: spotMeSettings.googleAccessToken,
      })
        .from(spotMeSettings)
        .where(eq(spotMeSettings.userId, user.id))
        .limit(1)
    )

    if (!rows.length) {
      return NextResponse.json({
        connected: false,
        google_email: null,
        max_walk_minutes: 25,
        onboarding_completed: false,
      })
    }

    const row = rows[0]
    return NextResponse.json({
      connected: !!row.hasAccessToken,
      google_email: row.googleEmail,
      max_walk_minutes: row.maxWalkMinutes,
      onboarding_completed: row.onboardingCompleted,
    })
  } catch (error) {
    console.error('GET /api/modules/spot-me/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const validation = await validateRequestBody(request, UpdateSettingsSchema)
    if (!validation.success) return validation.response

    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (validation.data.max_walk_minutes !== undefined) patch.maxWalkMinutes = validation.data.max_walk_minutes
    if (validation.data.onboarding_completed !== undefined) patch.onboardingCompleted = validation.data.onboarding_completed

    await withRLS((db) =>
      db.insert(spotMeSettings)
        .values({
          userId: user.id,
          maxWalkMinutes: validation.data.max_walk_minutes ?? 25,
          onboardingCompleted: validation.data.onboarding_completed ?? false,
        })
        .onConflictDoUpdate({
          target: [spotMeSettings.userId],
          set: { ...patch, updatedAt: sql`timezone('utc'::text, now())` },
        })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/modules/spot-me/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) return createErrorResponse('Unauthorized', 401)

    await withRLS((db) =>
      db.update(spotMeSettings)
        .set({
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          googleEmail: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(spotMeSettings.userId, user.id))
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/modules/spot-me/settings error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
