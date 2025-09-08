import { NextResponse } from 'next/server';

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_REDIRECT_URI = process.env.ZOOM_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/zoom/callback`;

export async function GET() {

  if (!ZOOM_CLIENT_ID) {
    return NextResponse.json({ 
      error: 'Zoom integration not configured. Please set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET environment variables.',
      configured: false
    }, { status: 400 });
  }

  try {
    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in session/cookie (simplified for now)
    const authUrl = new URL('https://zoom.us/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', ZOOM_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', ZOOM_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'meeting:read user:read');
    authUrl.searchParams.set('state', state);

    return NextResponse.json({ 
      authUrl: authUrl.toString(),
      state,
      configured: true
    });
  } catch (error) {
    console.error('Error creating auth URL:', error);
    return NextResponse.json({ 
      error: 'Failed to create authorization URL',
      configured: !!ZOOM_CLIENT_ID
    }, { status: 500 });
  }
}