import { NextRequest, NextResponse } from 'next/server';

interface ZoomPollQuestion {
  name: string;
  type: string;
  prompts: {
    prompt_question: string;
    prompt_right_answer: string;
  }[];
  answer_details: {
    answer: string;
    count: number;
  }[];
}

interface ZoomPollData {
  id: string;
  uuid: string;
  start_time: string;
  title: string;
  questions: ZoomPollQuestion[];
}

export async function GET(
  request: NextRequest, 
  { params }: { params: { meetingId: string } }
) {
  const { meetingId } = params;
  const accessToken = request.cookies.get('zoom_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated with Zoom' }, { status: 401 });
  }

  if (!meetingId) {
    return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
  }

  try {
    // Get poll results from the meeting
    const pollResponse = await fetch(`https://api.zoom.us/v2/past_meetings/${meetingId}/polls`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pollResponse.ok) {
      if (pollResponse.status === 401) {
        return NextResponse.json({ error: 'Zoom token expired' }, { status: 401 });
      }
      if (pollResponse.status === 404) {
        return NextResponse.json({ error: 'Meeting not found or no poll data available' }, { status: 404 });
      }
      throw new Error(`Failed to get poll data: ${pollResponse.status}`);
    }

    const pollData: ZoomPollData = await pollResponse.json();

    if (!pollData.questions || pollData.questions.length === 0) {
      return NextResponse.json({ 
        error: 'No poll questions found for this meeting. The meeting may not have had polls, or poll reports may need to be generated manually in Zoom first.' 
      }, { status: 404 });
    }

    // Transform Zoom poll data into our Vote format
    const transformedPolls = pollData.questions.map((question, index) => {
      const votes = question.answer_details.flatMap(answer => 
        // Create individual vote records for each response
        Array(answer.count).fill(null).map((_, voteIndex) => ({
          username: `zoom_user_${answer.answer}_${voteIndex + 1}`,
          email: `zoom_user_${answer.answer}_${voteIndex + 1}@example.com`,
          time: pollData.start_time,
          choice: answer.answer
        }))
      );

      return {
        name: question.name || `Poll ${index + 1}`,
        question: question.prompts?.[0]?.prompt_question || question.name || `Poll Question ${index + 1}`,
        votes: votes
      };
    });

    return NextResponse.json({
      meeting_id: pollData.id,
      meeting_uuid: pollData.uuid,
      meeting_title: pollData.title,
      start_time: pollData.start_time,
      polls: transformedPolls
    });

  } catch (error) {
    console.error('Error fetching poll data:', error);
    return NextResponse.json({ error: 'Failed to fetch poll data' }, { status: 500 });
  }
}