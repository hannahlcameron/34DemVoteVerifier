import { useState, useCallback } from 'react';

interface ZoomMeeting {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  type: number;
  poll_count: number;
  has_polls: boolean;
}

interface ZoomPoll {
  name: string;
  question: string;
  votes: Array<{
    username: string;
    email: string;
    time: string;
    choice: string;
  }>;
}

interface ZoomMeetingsResponse {
  meetings: ZoomMeeting[];
  pagination: {
    page_count: number;
    page_number: number;
    page_size: number;
    total_records: number;
  };
}

interface ZoomPollsResponse {
  meeting_id: string;
  meeting_uuid: string;
  meeting_title: string;
  start_time: string;
  polls: ZoomPoll[];
}

export const useZoomIntegration = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/zoom/meetings');
      if (response.status === 401) {
        setIsAuthenticated(false);
        return false;
      } else if (response.ok) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  }, []);

  const initiateLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/zoom/auth');
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 400 && !data.configured) {
          throw new Error('Zoom integration is not configured. Please contact your administrator.');
        }
        throw new Error(data.error || 'Failed to get authorization URL');
      }
      
      // Store state for validation (in real app, use more secure storage)
      sessionStorage.setItem('zoom_oauth_state', data.state);
      
      // Redirect to Zoom OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to initiate Zoom login');
      setIsLoading(false);
    }
  }, []);

  const fetchMeetings = useCallback(async (pageNumber = 1, pageSize = 30) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/zoom/meetings', window.location.origin);
      url.searchParams.set('page_number', pageNumber.toString());
      url.searchParams.set('page_size', pageSize.toString());
      
      const response = await fetch(url.toString());
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error('Please log in to Zoom first');
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      
      const data: ZoomMeetingsResponse = await response.json();
      setMeetings(data.meetings);
      setIsAuthenticated(true);
      
      return data;
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch meetings');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPollData = useCallback(async (meetingId: string): Promise<ZoomPoll[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/zoom/polls/${meetingId}`);
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error('Please log in to Zoom first');
      }
      
      if (response.status === 404) {
        throw new Error('No poll data found for this meeting. Polls may need to be generated manually in Zoom first.');
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch poll data');
      }
      
      const data: ZoomPollsResponse = await response.json();
      return data.polls;
    } catch (error) {
      console.error('Error fetching poll data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch poll data');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear auth cookies by calling logout endpoint or expiring them
    document.cookie = 'zoom_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'zoom_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setIsAuthenticated(false);
    setMeetings([]);
    setError(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    meetings,
    error,
    checkAuthStatus,
    initiateLogin,
    fetchMeetings,
    fetchPollData,
    logout
  };
};