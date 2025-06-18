import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard'
  const source = searchParams.get('source')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if this is from desktop app
      if (source === 'desktop') {
        // For OAuth from desktop, always redirect to login page to show success card
        return NextResponse.redirect(`${origin}/login?success=true&source=desktop`)
      } else {
        // Redirect to dashboard for web users
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    console.error('Error exchanging code for session:', error)
  }

  // return the user to an error page with instructions
  console.error('No code found in callback or error exchanging code.')
  return NextResponse.redirect(`${origin}/login?error=OAuth authentication failed. Please try again.`)
}
