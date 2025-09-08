/**
 * @jest-environment node
 */

import { GET } from '../../app/api/zoom/auth/route';
import { NextResponse } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ 
      data, 
      status: options?.status || 200 
    }))
  }
}));

describe('/api/zoom/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.ZOOM_CLIENT_ID;
    delete process.env.ZOOM_CLIENT_SECRET;
    delete process.env.ZOOM_REDIRECT_URI;
    delete process.env.NEXTAUTH_URL;
  });

  it('returns error when Zoom client ID is not configured', async () => {
    const response = await GET();
    
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('not configured'),
        configured: false
      }),
      { status: 400 }
    );
  });

  it('creates auth URL when properly configured', async () => {
    process.env.ZOOM_CLIENT_ID = 'test_client_id';
    process.env.ZOOM_CLIENT_SECRET = 'test_client_secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    const response = await GET();
    
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        authUrl: expect.stringContaining('zoom.us/oauth/authorize'),
        state: expect.any(String),
        configured: true
      }),
      undefined
    );
  });

  it('uses default redirect URI when not specified', async () => {
    process.env.ZOOM_CLIENT_ID = 'test_client_id';
    process.env.ZOOM_CLIENT_SECRET = 'test_client_secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    const response = await GET();
    
    const callArgs = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArgs.authUrl).toContain('redirect_uri=http%3A//localhost%3A3000/api/zoom/callback');
  });
});