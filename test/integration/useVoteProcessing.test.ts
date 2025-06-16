import { renderHook, act } from '@testing-library/react';
import { useVoteProcessing } from '../../app/hooks/useVoteProcessing';
import fs from 'fs';
import path from 'path';

describe('useVoteProcessing hook with multi-poll data', () => {
  let multiPollCSV: string;
  let memberListTSV: string;

  beforeAll(() => {
    // Load the multi-poll test data
    const csvPath = path.join(process.cwd(), 'test/data/multi-poll-test.csv');
    multiPollCSV = fs.readFileSync(csvPath, 'utf8');

    // Load the member list test data
    const tsvPath = path.join(process.cwd(), 'test/data/members-simple.txt');
    memberListTSV = fs.readFileSync(tsvPath, 'utf8');
  });

  it('should correctly process multiple polls from a CSV file', async () => {
    // Mock File objects
    const memberFile = new File([memberListTSV], 'members.txt', { type: 'text/plain' });
    const pollFile = new File([multiPollCSV], 'polls.csv', { type: 'text/csv' });

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

    // Check that we have multiple poll results
    expect(result.current.pollResults.length).toBeGreaterThan(1);
    expect(result.current.pollResults.length).toBe(4); // Our test file has 4 polls

    // Check poll names
    const pollNames = result.current.pollResults.map(poll => poll.name);
    expect(pollNames).toContain('City Council Position 1');
    expect(pollNames).toContain('City Council Position 2');
    expect(pollNames).toContain('Mayor Race');
    expect(pollNames).toContain('School Board, District 3');

    // Check vote counts
    const cityCouncil1 = result.current.pollResults.find(poll => poll.name === 'City Council Position 1');
    const cityCouncil2 = result.current.pollResults.find(poll => poll.name === 'City Council Position 2');
    const mayorRace = result.current.pollResults.find(poll => poll.name === 'Mayor Race');
    const schoolBoard = result.current.pollResults.find(poll => poll.name === 'School Board, District 3');

    expect(cityCouncil1?.votes.length).toBe(5);
    expect(cityCouncil2?.votes.length).toBe(4);
    expect(mayorRace?.votes.length).toBe(6);
    expect(schoolBoard?.votes.length).toBe(3);

    // Check that each poll has categorized votes
    result.current.pollResults.forEach(poll => {
      expect(poll.categorizedVotes).toBeDefined();
      expect(poll.categorizedVotes.validVotes).toBeDefined();
      expect(poll.categorizedVotes.invalidVotes).toBeDefined();
      expect(poll.categorizedVotes.duplicateVotes).toBeDefined();
    });

    // Check that each poll has a choice-to-votes map
    result.current.pollResults.forEach(poll => {
      expect(poll.choiceToVotes).toBeDefined();
      // In our test data, the choiceToVotes map might be empty because all votes are invalid
      // Just check that it's a Map instance
      expect(poll.choiceToVotes instanceof Map).toBe(true);
    });
  });

  it('should handle poll names with commas', async () => {
    // Mock File objects
    const memberFile = new File([memberListTSV], 'members.txt', { type: 'text/plain' });
    const pollFile = new File([multiPollCSV], 'polls.csv', { type: 'text/csv' });

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

    // Check that the poll with a comma in its name is processed correctly
    const schoolBoard = result.current.pollResults.find(poll => poll.name === 'School Board, District 3');
    expect(schoolBoard).toBeDefined();
    expect(schoolBoard?.votes.length).toBe(3);
  });

  it('should update poll results when member data changes', async () => {
    // Create a member file with valid member data
    const validMemberData = `VANID\tName\tEmail
123456\tJane Smith\tjane.smith@example.com
234567\tJohn Doe\tjohn.doe@example.com
345678\tEmily Brown\temily.brown@example.com`;
    
    const memberFile = new File([validMemberData], 'members.txt', { type: 'text/plain' });
    const pollFile = new File([multiPollCSV], 'polls.csv', { type: 'text/csv' });

    // Render the hook
    const { result } = renderHook(() => useVoteProcessing());

    // Upload poll data first
    await act(async () => {
      await result.current.handlePollUpload(pollFile);
    });

    // Store the initial categorized votes
    const initialInvalidVotes = result.current.pollResults[0].categorizedVotes.invalidVotes.length;

    // Upload member data that matches some of the votes
    await act(async () => {
      await result.current.handleMembersUpload(memberFile);
    });

    // Check that the categorized votes have changed
    // Some votes should now be valid instead of invalid
    expect(result.current.pollResults[0].categorizedVotes.invalidVotes.length).not.toBe(initialInvalidVotes);
  });

  it('should handle errors in poll data', async () => {
    // Create invalid CSV data
    const invalidCSV = 'This is not a valid CSV file';
    const invalidFile = new File([invalidCSV], 'invalid.csv', { type: 'text/csv' });

    // Render the hook
    const { result } = renderHook(() => useVoteProcessing());

    // Try to upload invalid poll data
    await expect(async () => {
      await act(async () => {
        await result.current.handlePollUpload(invalidFile);
      });
    }).rejects.toThrow();
  });

  it('should handle errors in member data', async () => {
    // Create invalid TSV data
    const invalidTSV = 'This is not a valid TSV file';
    const invalidFile = new File([invalidTSV], 'invalid.txt', { type: 'text/plain' });

    // Render the hook
    const { result } = renderHook(() => useVoteProcessing());

    // Try to upload invalid member data
    await expect(async () => {
      await act(async () => {
        await result.current.handleMembersUpload(invalidFile);
      });
    }).rejects.toThrow();
  });

  it('should reset data correctly', async () => {
    // Mock File objects
    const memberFile = new File([memberListTSV], 'members.txt', { type: 'text/plain' });
    const pollFile = new File([multiPollCSV], 'polls.csv', { type: 'text/csv' });

    // Render the hook
    const { result } = renderHook(() => useVoteProcessing());

    // Upload data
    await act(async () => {
      await result.current.handleMembersUpload(memberFile);
      await result.current.handlePollUpload(pollFile);
    });

    // Check that we have data
    expect(result.current.memberData.length).toBeGreaterThan(0);
    expect(result.current.pollResults.length).toBeGreaterThan(0);

    // Reset data
    act(() => {
      result.current.resetData();
    });

    // Check that data has been reset
    expect(result.current.memberData.length).toBe(0);
    expect(result.current.pollResults.length).toBe(0);
  });
});
