import { NextRequest, NextResponse } from 'next/server';

interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  type: number;
  uuid: string;
}

interface ZoomMeetingsResponse {
  meetings: ZoomMeeting[];
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('zoom_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Zoom' }, { status: 401 });
  }

  try {
    // Get user info first to get user ID
    const userResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return NextResponse.json({ error: 'Zoom token expired' }, { status: 401 });
      }
      throw new Error(`Failed to get user info: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Get past meetings with pagination
    const searchParams = request.nextUrl.searchParams;
    const pageSize = searchParams.get('page_size') || '30';
    const pageNumber = searchParams.get('page_number') || '1';
    
    // Get meetings from last 30 days
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const meetingsUrl = new URL(`https://api.zoom.us/v2/users/${userId}/meetings`);
    meetingsUrl.searchParams.set('type', 'previous_meetings');
    meetingsUrl.searchParams.set('page_size', pageSize);
    meetingsUrl.searchParams.set('page_number', pageNumber);
    meetingsUrl.searchParams.set('from', fromDate.toISOString().split('T')[0]);
    meetingsUrl.searchParams.set('to', toDate.toISOString().split('T')[0]);

    const meetingsResponse = await fetch(meetingsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!meetingsResponse.ok) {
      throw new Error(`Failed to get meetings: ${meetingsResponse.status}`);
    }

    const meetingsData: ZoomMeetingsResponse = await meetingsResponse.json();

    // For each meeting, try to get poll information
    const meetingsWithPollInfo = await Promise.all(
      meetingsData.meetings.map(async (meeting) => {
        try {
          // Try to get poll results for this meeting
          const pollResponse = await fetch(`https://api.zoom.us/v2/past_meetings/${meeting.uuid}/polls`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          let pollCount = 0;
          let hasPolls = false;

          if (pollResponse.ok) {
            const pollData = await pollResponse.json();
            if (pollData.questions && Array.isArray(pollData.questions)) {
              pollCount = pollData.questions.length;
              hasPolls = pollCount > 0;
            }
          }

          return {
            id: meeting.id,
            uuid: meeting.uuid,
            topic: meeting.topic,
            start_time: meeting.start_time,
            duration: meeting.duration,
            type: meeting.type,
            poll_count: pollCount,
            has_polls: hasPolls
          };
        } catch (error) {
          // If we can't get poll info, just return the meeting without poll data
          return {
            id: meeting.id,
            uuid: meeting.uuid,
            topic: meeting.topic,
            start_time: meeting.start_time,
            duration: meeting.duration,
            type: meeting.type,
            poll_count: 0,
            has_polls: false
          };
        }
      })
    );

    return NextResponse.json({
      meetings: meetingsWithPollInfo,
      pagination: {
        page_count: meetingsData.page_count,
        page_number: meetingsData.page_number,
        page_size: meetingsData.page_size,
        total_records: meetingsData.total_records
      }
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}