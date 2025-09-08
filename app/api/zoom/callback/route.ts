import { NextRequest, NextResponse } from 'next/server';

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/zoom/callback`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_error=no_code`);
  }

  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_error=config_missing`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ZOOM_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    
    // In a real app, you'd store this securely (database, encrypted session, etc.)
    // For now, we'll redirect with the token in a secure way
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_success=true`);
    
    // Set secure, httpOnly cookies for the tokens
    response.cookies.set('zoom_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    });
    
    if (tokenData.refresh_token) {
      response.cookies.set('zoom_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    return response;
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?zoom_error=server_error`);
  }
}