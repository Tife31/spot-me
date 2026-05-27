import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { createErrorResponse } from '@/lib/api-helpers'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

export async function GET(_request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser()
    if (!user) return createErrorResponse('Unauthorized', 401)

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return createErrorResponse('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in .env.local', 503)

    const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/modules/spot-me/oauth/callback`

    // CSRF state: random value stored in httpOnly cookie
    const state = randomBytes(16).toString('hex')
    const cookieStore = await cookies()
    cookieStore.set('spot_me_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`)
  } catch (error) {
    console.error('GET /api/modules/spot-me/oauth/start error:', error instanceof Error ? error.message : error)
    return createErrorResponse('Internal server error', 500)
  }
}
