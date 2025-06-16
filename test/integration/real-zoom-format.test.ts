import { parseCSVVotes } from '../../app/vote-verification';
import fs from 'fs';
import path from 'path';
import { renderHook, act } from '@testing-library/react';
import { useVoteProcessing } from '../../app/hooks/useVoteProcessing';

describe('Real Zoom Poll Format', () => {
  let zoomPollCSV: string;

  beforeAll(() => {
    // Load the real Zoom poll format test data
    const filePath = path.join(process.cwd(), 'test/data/real-zoom-poll-format.csv');
    zoomPollCSV = fs.readFileSync(filePath, 'utf8');
  });

  it('should correctly parse all 16 polls from the Zoom format', () => {
    const result = parseCSVVotes(zoomPollCSV);
    
    // Should not return an error
    expect('error' in result).toBe(false);
    
    if (!('error' in result)) {
      // Should find all 16 polls
      expect(result.length).toBe(16);
      
      // Check poll names
      const pollNames = result.map(poll => poll.name);
      for (let i = 1; i <= 16; i++) {
        if (i === 5) {
          expect(pollNames).toContain('Poll Question 5, with comma');
        } else {
          expect(pollNames).toContain(`Poll Question ${i}`);
        }
      }
      
      // Check vote counts - each poll should have 3 votes
      result.forEach(poll => {
        expect(poll.votes.length).toBe(3);
      });
      
      // Check that the poll with a comma in its name is processed correctly
      const pollWithComma = result.find(poll => poll.name === 'Poll Question 5, with comma');
      expect(pollWithComma).toBeDefined();
      expect(pollWithComma?.votes.length).toBe(3);
      
      // Check that each poll has a question
      result.forEach(poll => {
        expect(poll.question).toBeDefined();
        expect(poll.question).toContain('What is your response to Poll Question');
      });
    }
  });

  it('should detect missing polls', () => {
    // Create a modified CSV with a missing poll
    const lines = zoomPollCSV.split(/\r?\n/);
    
    // Find the start and end of Poll Question 8
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Poll Question 8') {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim() === 'Poll Question 9') {
        endIndex = i;
        break;
      }
    }
    
    // Remove the poll section
    if (startIndex !== -1 && endIndex !== -1) {
      const modifiedLines = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];
      const modifiedCSV = modifiedLines.join('\n');
      
      // Test with the modified CSV
      const result = parseCSVVotes(modifiedCSV);
      
      // Should return an error
      expect('error' in result).toBe(true);
      
      if ('error' in result) {
        expect(result.error).toContain('Poll Question 8');
      }
    }
  });

  it('should handle poll names with commas in quotes', () => {
    // Create a modified CSV with an additional poll with a comma in its name
    const lines = zoomPollCSV.split(/\r?\n/);
    
    // Find the Launched Polls section
    let launchedPollsIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'Launched Polls') {
        launchedPollsIndex = i;
        break;
      }
    }
    
    // Find the end of the Launched Polls section
    let endOfLaunchedPolls = -1;
    if (launchedPollsIndex !== -1) {
      for (let i = launchedPollsIndex + 1; i < lines.length; i++) {
        if (lines[i].trim() === '') {
          endOfLaunchedPolls = i;
          break;
        }
      }
    }
    
    // Add a new poll with a comma in its name to the Launched Polls section
    if (launchedPollsIndex !== -1 && endOfLaunchedPolls !== -1) {
      lines.splice(endOfLaunchedPolls, 0, '17,"Another Poll, with a comma",1,50');
      
      // Add the poll section at the end of the file
      lines.push('');
      lines.push('"Another Poll, with a comma"');
      lines.push('#,User Name,Email Address,Submitted Date and Time,What is your response to this poll?');
      lines.push('1,John Smith,john.smith@example.com,2025-06-15 21:20:00,"Yes",,');
      lines.push('2,Jane Doe,jane.doe@example.com,2025-06-15 21:20:05,"No",,');
      lines.push('3,Bob Johnson,bob.johnson@example.com,2025-06-15 21:20:10,"Yes",,');
      
      const modifiedCSV = lines.join('\n');
      
      // Test with the modified CSV
      const result = parseCSVVotes(modifiedCSV);
      
      // Should not return an error
      expect('error' in result).toBe(false);
      
      if (!('error' in result)) {
        // Should find 17 polls now
        expect(result.length).toBe(17);
        
        // Check that the new poll with a comma in its name is processed correctly
        const newPollWithComma = result.find(poll => poll.name === 'Another Poll, with a comma');
        expect(newPollWithComma).toBeDefined();
        expect(newPollWithComma?.votes.length).toBe(3);
      }
    }
  });

  it('should work with the useVoteProcessing hook', async () => {
    // Mock File objects
    const memberListTSV = fs.readFileSync(path.join(process.cwd(), 'test/data/members-simple.txt'), 'utf8');
    const memberFile = new File([memberListTSV], 'members.txt', { type: 'text/plain' });
    const pollFile = new File([zoomPollCSV], 'polls.csv', { type: 'text/csv' });
    
    // Render the hook
    const { result } = renderHook(() => useVoteProcessing());
    
    // Upload member data
    await act(async () => {
      await result.current.handleMembersUpload(memberFile);
    });
    
    // Upload poll data
    await act(async () => {
      await result.current.handlePollUpload(pollFile);
    });
    
    // Check that we have 16 poll results
    expect(result.current.pollResults.length).toBe(16);
    
    // Check poll names
    const pollNames = result.current.pollResults.map((poll: any) => poll.name);
    for (let i = 1; i <= 16; i++) {
      if (i === 5) {
        expect(pollNames).toContain('Poll Question 5, with comma');
      } else {
        expect(pollNames).toContain(`Poll Question ${i}`);
      }
    }
  });
});
