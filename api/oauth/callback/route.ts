import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { encrypt } from '@/lib/crypto'
import { spotMeSettings } from '@/lib/db/schema'
import { cookies } from 'next/headers'
import { eq, sql } from 'drizzle-orm'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const settingsUrl = `${baseUrl}/spot-me/settings`

  try {
    const { user, withRLS } = await getAuthenticatedUser()
    if (!user || !withRLS) {
      return NextResponse.redirect(`${settingsUrl}?error=unauthorized`)
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('[SpotMe] OAuth error from Google:', error)
      return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${settingsUrl}?error=missing_params`)
    }

    // Verify CSRF state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('spot_me_oauth_state')?.value
    cookieStore.delete('spot_me_oauth_state')

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${baseUrl}/api/modules/spot-me/oauth/callback`

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}))
      console.error('[SpotMe] Token exchange failed:', err)
      return NextResponse.redirect(`${settingsUrl}?error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Fetch user email
    let googleEmail: string | null = null
    try {
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (userRes.ok) {
        const userInfo = await userRes.json()
        googleEmail = userInfo.email ?? null
      }
    } catch {
      // Non-fatal: email is cosmetic
    }

    // Store encrypted tokens
    await withRLS((db) =>
      db.insert(spotMeSettings)
        .values({
          userId: user.id,
          googleAccessToken: encrypt(tokens.access_token),
          googleRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          googleTokenExpiry: expiresAt,
          googleEmail,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [spotMeSettings.userId],
          set: {
            googleAccessToken: encrypt(tokens.access_token),
            googleRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : sql`${spotMeSettings.googleRefreshToken}`,
            googleTokenExpiry: expiresAt,
            googleEmail,
            updatedAt: sql`timezone('utc'::text, now())`,
          },
        })
    )

    return NextResponse.redirect(`${settingsUrl}?connected=true`)
  } catch (error) {
    console.error('[SpotMe] OAuth callback error:', error instanceof Error ? error.message : error)
    return NextResponse.redirect(`${settingsUrl}?error=server_error`)
  }
}
