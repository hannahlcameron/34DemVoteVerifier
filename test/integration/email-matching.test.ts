import { 
  parseMemberList,
  validateVotes,
  type Member,
  type Vote
} from '../../app/vote-verification';

describe('Email Matching Tests', () => {
  let members: Member[];
  
  beforeEach(() => {
    // Create a simple member list
    members = [
      {
        vanId: '123456',
        name: 'Nick Bonanza',
        preferredEmail: 'hello@example.com'
      },
      {
        vanId: '789012',
        name: 'Jane Smith',
        preferredEmail: 'jane@example.com'
      }
    ];
  });

  test('should match vote with exact name', () => {
    const votes: Vote[] = [
      {
        username: 'Nick Bonanza',
        email: 'different@example.com', // Different email
        time: '2025-06-15 10:00:00',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  test('should match vote with exact email but different name', () => {
    const votes: Vote[] = [
      {
        username: 'Nick A Bonanza', // Different name
        email: 'hello@example.com', // Matching email
        time: '2025-06-15 10:00:00',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  test('should match vote with case-insensitive email', () => {
    const votes: Vote[] = [
      {
        username: 'Different Name',
        email: 'HELLO@example.com', // Same email but different case
        time: '2025-06-15 10:00:00',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
  });

  test('should not match when both name and email are different', () => {
    const votes: Vote[] = [
      {
        username: 'Unknown Person',
        email: 'unknown@example.com',
        time: '2025-06-15 10:00:00',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(1);
  });

  test('should handle multiple votes with different matching criteria', () => {
    const votes: Vote[] = [
      {
        username: 'Nick Bonanza', // Name match
        email: 'different@example.com',
        time: '2025-06-15 10:00:00',
        choice: 'Yes'
      },
      {
        username: 'Jane Different', // Email match
        email: 'jane@example.com',
        time: '2025-06-15 10:05:00',
        choice: 'No'
      },
      {
        username: 'Unknown Person', // No match
        email: 'unknown@example.com',
        time: '2025-06-15 10:10:00',
        choice: 'Abstain'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
  });
});
