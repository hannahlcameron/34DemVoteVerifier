import { readFileSync } from 'fs';
import { join } from 'path';

import { 
  parseMemberList,
  parseVoteData,
  validateVotes,
  addAlias,
  getDuplicateVotes,
  type Member,
  type Vote
} from '../../app/vote-verification';

describe('Vote Verification Flow', () => {
  const TEST_DATA_DIR = join(__dirname, '..', 'data');
  
  // Test data files
  const membersFull = readFileSync(join(TEST_DATA_DIR, 'members-full.txt'), 'utf8');
  const membersSimple = readFileSync(join(TEST_DATA_DIR, 'members-simple.txt'), 'utf8');
  const votesAG = readFileSync(join(TEST_DATA_DIR, 'votes-ag.csv'), 'utf8');
  const votesWhitespace = readFileSync(join(TEST_DATA_DIR, 'votes-whitespace.csv'), 'utf8');

  describe('Membership List Processing', () => {
    test('should parse full membership list format', () => {
      const members = parseMemberList(membersFull);
      expect(members).toHaveLength(25);
      expect(members[0]).toEqual({
        vanId: '987654321',
        name: 'Hillary Clinton',
        preferredEmail: 'hrc2024@democracy.org'
      });
    });

    test('should parse simplified membership list format', () => {
      const members = parseMemberList(membersSimple);
      expect(members).toHaveLength(25);
      expect(members[0]).toEqual({
        vanId: '987654321',
        name: 'Hillary Clinton',
        preferredEmail: 'hrc2024@democracy.org'
      });
    });
  });

  describe('Vote Data Processing', () => {
    describe('Attorney General Vote Data', () => {
      let votes: Vote[];

      beforeEach(() => {
        votes = parseVoteData(votesAG);
      });

      test('should parse all votes', () => {
        expect(votes).toHaveLength(25);
      });

      test('should parse vote details correctly', () => {
        expect(votes[0]).toEqual({
          username: 'Hillary Clinton',
          email: 'hrc2024@democracy.org',
          time: '2024-06-12 19:12:47',
          choice: 'Manka Dhingra'
        });
      });

      test('should handle special characters in fields', () => {
        // Find a vote with special characters (like apostrophe)
        const voteWithSpecialChars = votes.find(v => v.username.includes("O'Rourke"));
        expect(voteWithSpecialChars).toBeDefined();
        expect(voteWithSpecialChars?.username).toBe("Beto O'Rourke");
      });
    });

    describe('Whitespace Vote Data', () => {
      let votes: Vote[];

      beforeEach(() => {
        votes = parseVoteData(votesWhitespace);
      });

      test('should parse all votes', () => {
        expect(votes).toHaveLength(25);
      });

      test('should parse vote details correctly', () => {
        expect(votes[0]).toEqual({
          username: 'Hillary Clinton',
          email: 'hrc2024@democracy.org',
          time: '2/12/25 19:54',
          choice: 'YES! Adopt the Resolution'
        });
      });

      test('should handle empty lines', () => {
        // The whitespace file has empty lines between sections
        expect(votes.every(v => v.username && v.email && v.time && v.choice)).toBe(true);
      });

      test('should handle abstain votes', () => {
        const abstainVote = votes.find(v => v.choice.toLowerCase() === 'abstain');
        expect(abstainVote).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      test('should throw error for empty input', () => {
        expect(() => parseVoteData('')).toThrow('The input file is empty');
      });

      test('should throw error for invalid format', () => {
        expect(() => parseVoteData('invalid,csv,format')).toThrow('No poll data found');
      });
    });
  });

  describe('Vote Validation', () => {
    let members: Member[];
    let votes: Vote[];

    beforeEach(() => {
      members = parseMemberList(membersSimple);
      votes = parseVoteData(votesAG);
    });

    test('should identify valid votes', () => {
      const result = validateVotes(votes, members);
      expect(result.valid).toHaveLength(25); // All votes should be valid since we used same names
    });

    test('should identify invalid votes when names dont match', () => {
      // Modify some votes to have non-matching names
      votes[0].username = 'Unknown Person';
      votes[1].username = 'Another Unknown';
      
      const result = validateVotes(votes, members);
      expect(result.invalid).toHaveLength(2);
    });

      test('should handle aliases for validation', () => {
        // Add an alias for a modified name
        votes[0].username = 'Hill Clinton'; // Modified name
        addAlias('987654321', 'Hill Clinton');
        
        const result = validateVotes(votes, members);
        expect(result.valid).toContainEqual(expect.objectContaining({
          username: 'Hill Clinton',
          email: 'hrc2024@democracy.org'
        }));
      });

      test('should identify duplicate votes', () => {
        // Add a duplicate vote
        votes.push({...votes[0]});
        
        const result = validateVotes(votes, members);
        const duplicates = getDuplicateVotes(result);
        expect(duplicates).toHaveLength(1);
        expect(duplicates[0].username).toBe('Hillary Clinton');
      });
  });

  describe('End-to-End Flow', () => {
    test('should process full verification flow', () => {
      // 1. Parse member list
      const members = parseMemberList(membersSimple);
      expect(members).toBeTruthy();

      // 2. Parse votes
      const votes = parseVoteData(votesAG);
      expect(votes).toBeTruthy();

      // 3. Add some aliases
      addAlias('987654321', 'Hill Clinton');
      addAlias('987654322', 'Michelle O');

      // 4. Validate votes
      const result = validateVotes(votes, members);
      expect(result).toBeTruthy();
      expect(result.valid.length + result.invalid.length).toBe(votes.length);

      // 5. Check for duplicates
      const duplicates = getDuplicateVotes(result);
      expect(duplicates).toBeDefined();
    });
  });
});
