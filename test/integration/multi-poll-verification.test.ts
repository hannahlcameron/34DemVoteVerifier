import { parseCSVVotes, findVoteBlocks } from '../../app/vote-verification';
import fs from 'fs';
import path from 'path';

describe('Multi-Poll Verification', () => {
  let multiPollCSV: string;

  beforeAll(() => {
    // Load the multi-poll test data
    const filePath = path.join(process.cwd(), 'test/data/multi-poll-test.csv');
    multiPollCSV = fs.readFileSync(filePath, 'utf8');
  });

  it('should correctly parse the Launched Polls section', () => {
    const lines = multiPollCSV.split(/\r?\n/);
    const { voteBlocks, missingPolls } = findVoteBlocks(lines);
    
    // Should find all 4 polls
    expect(voteBlocks.length).toBe(4);
    expect(missingPolls.length).toBe(0);
    
    // Check poll names
    expect(voteBlocks[0].title).toBe('City Council Position 1');
    expect(voteBlocks[1].title).toBe('City Council Position 2');
    expect(voteBlocks[2].title).toBe('Mayor Race');
    expect(voteBlocks[3].title).toBe('School Board, District 3');
    
    // Check questions
    expect(voteBlocks[0].question).toBe('Who do you support for City Council Position 1?');
    expect(voteBlocks[1].question).toBe('Who do you support for City Council Position 2?');
    expect(voteBlocks[2].question).toBe('Who do you support for Mayor?');
    expect(voteBlocks[3].question).toBe('Who do you support for School Board District 3?');
  });

  it('should correctly handle poll names with commas', () => {
    const lines = multiPollCSV.split(/\r?\n/);
    const { voteBlocks, missingPolls } = findVoteBlocks(lines);
    
    // The fourth poll has a comma in its name
    const pollWithComma = voteBlocks[3];
    expect(pollWithComma.title).toBe('School Board, District 3');
  });

  it('should correctly parse all polls from the CSV', () => {
    const result = parseCSVVotes(multiPollCSV);
    
    // Should not return an error
    expect('error' in result).toBe(false);
    
    if (!('error' in result)) {
      // Should find all 4 polls
      expect(result.length).toBe(4);
      
      // Check poll names
      expect(result[0].name).toBe('City Council Position 1');
      expect(result[1].name).toBe('City Council Position 2');
      expect(result[2].name).toBe('Mayor Race');
      expect(result[3].name).toBe('School Board, District 3');
      
      // Check vote counts
      expect(result[0].votes.length).toBe(5);
      expect(result[1].votes.length).toBe(4);
      expect(result[2].votes.length).toBe(6);
      expect(result[3].votes.length).toBe(3);
    }
  });

  it('should correctly extract vote choices', () => {
    const result = parseCSVVotes(multiPollCSV);
    
    if (!('error' in result)) {
      // First poll
      const poll1 = result[0];
      const sarahVotes = poll1.votes.filter(v => v.choice === 'Sarah Johnson');
      const michaelVotes = poll1.votes.filter(v => v.choice === 'Michael Williams');
      const davidVotes = poll1.votes.filter(v => v.choice === 'David Martinez');
      
      expect(sarahVotes.length).toBe(3);
      expect(michaelVotes.length).toBe(1);
      expect(davidVotes.length).toBe(1);
      
      // Second poll
      const poll2 = result[1];
      const jenniferVotes = poll2.votes.filter(v => v.choice === 'Jennifer Lee');
      const thomasVotes = poll2.votes.filter(v => v.choice === 'Thomas Anderson');
      
      expect(jenniferVotes.length).toBe(2);
      expect(thomasVotes.length).toBe(2);
    }
  });

  it('should detect missing polls', () => {
    // Create a modified CSV with a missing poll
    const lines = multiPollCSV.split(/\r?\n/);
    
    // Find the start and end of the "City Council Position 2" poll
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'City Council Position 2') {
        startIndex = i;
      } else if (startIndex !== -1 && lines[i].trim() === 'Mayor Race') {
        endIndex = i;
        break;
      }
    }
    
    // Remove the poll section
    if (startIndex !== -1 && endIndex !== -1) {
      const modifiedLines = [...lines.slice(0, startIndex), ...lines.slice(endIndex)];
      
      // Test with the modified CSV
      const { voteBlocks, missingPolls } = findVoteBlocks(modifiedLines);
      
      // Should detect the missing poll
      expect(missingPolls).toContain('City Council Position 2');
      expect(voteBlocks.length).toBe(3);
    }
  });

  it('should handle quoted poll names in the Launched Polls section', () => {
    const lines = multiPollCSV.split(/\r?\n/);
    
    // Find the line with the quoted poll name
    const quotedPollLine = lines.find(line => line.includes('"School Board, District 3"'));
    expect(quotedPollLine).toBeDefined();
    
    if (quotedPollLine) {
      // Extract the poll name using our parsing logic
      const match = quotedPollLine.match(/^(\d+),\s*(.+)$/);
      expect(match).not.toBeNull();
      
      if (match) {
        const pollNumber = parseInt(match[1].trim());
        const remainder = match[2].trim();
        
        expect(pollNumber).toBe(4);
        expect(remainder.startsWith('"')).toBe(true);
        
        // Extract the poll name
        const endQuoteIndex = remainder.indexOf('"', 1);
        const pollName = remainder.substring(1, endQuoteIndex);
        
        expect(pollName).toBe('School Board, District 3');
      }
    }
  });
});
