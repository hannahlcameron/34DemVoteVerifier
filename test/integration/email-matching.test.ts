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

  test('should match Donald/Don scenario with same email', () => {
    // Create member with full name
    const members: Member[] = [
      {
        vanId: '555666',
        name: 'Donald Trump',
        preferredEmail: 'donald@example.com'
      }
    ];

    // Vote with shortened name but same email
    const votes: Vote[] = [
      {
        username: 'Don Trump', // Shortened first name
        email: 'donald@example.com', // Same email
        time: '2025-06-15 12:00:00',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0].username).toBe('Don Trump');
  });

  test('should handle member list with trailing whitespace and newlines', () => {
    // Simulate member list content with trailing whitespace/newlines (the actual bug)
    const memberListContent = `VANID\tName\tEmail
123456\tDonald Brubeck\td2brubeck@gmail.com\n
789012\tJane Smith\tjane@example.com \n
999888\tBob Wilson\tbob@example.com\t\n`;

    const members = parseMemberList(memberListContent);
    
    // Verify members are parsed correctly with trimmed fields
    expect(members).toHaveLength(3);
    expect(members[0]).toEqual({
      vanId: '123456',
      name: 'Donald Brubeck',
      preferredEmail: 'd2brubeck@gmail.com' // Should be trimmed, no newline
    });
    expect(members[1]).toEqual({
      vanId: '789012',
      name: 'Jane Smith',
      preferredEmail: 'jane@example.com' // Should be trimmed, no trailing space
    });
    expect(members[2]).toEqual({
      vanId: '999888',
      name: 'Bob Wilson',
      preferredEmail: 'bob@example.com' // Should be trimmed
    });

    // Now test that Don Brubeck vote matches Donald Brubeck member
    const votes: Vote[] = [
      {
        username: 'Don Brubeck', // Different name
        email: 'd2brubeck@gmail.com', // Same email (no trailing whitespace)
        time: '2025-06-15 18:50:30',
        choice: 'Yes'
      }
    ];
    
    const result = validateVotes(votes, members);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid[0].username).toBe('Don Brubeck');
  });
});
