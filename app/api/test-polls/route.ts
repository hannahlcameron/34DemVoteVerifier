import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCSVVotes } from '../../vote-verification';

export async function GET() {
  try {
    // Path to our test file
    const filePath = path.resolve(process.cwd(), 'test/data/multi-poll-test.csv');
    
    // Read the file
    const csv = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV
    const result = parseCSVVotes(csv);
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    } else {
      const pollSummary = result.map(poll => ({
        name: poll.name,
        votes: poll.votes.length,
        question: poll.question
      }));
      
      return NextResponse.json({ 
        success: true, 
        pollCount: result.length,
        polls: pollSummary
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
