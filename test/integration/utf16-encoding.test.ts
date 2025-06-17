import { 
  parseMemberList,
  validateVotes,
  type Member,
  type Vote
} from '../../app/vote-verification';

describe('UTF-16 Encoding Handling', () => {
  test('should handle UTF-16 encoded member list with extra spaces', () => {
    // Simulate UTF-16 encoding issue where spaces appear between every character
    // This is fictional data, not real PII
    const utf16EncodedContent = `V A N I D \t N a m e \t E m a i l  
1 2 3 4 5 6 \t R o b e r t   S m i t h \t r o b e r t @ e x a m p l e . c o m  
7 8 9 0 1 2 \t S a r a h   J o h n s o n \t s a r a h @ e x a m p l e . c o m  
3 4 5 6 7 8 \t M i c h a e l   D a v i s \t m i k e @ e x a m p l e . c o m  `;

    const members = parseMemberList(utf16EncodedContent);
    
    expect(members).toHaveLength(3);
    expect(members[0]).toEqual({
      vanId: '123456',
      name: 'Robert Smith',
      preferredEmail: 'robert@example.com'
    });
    expect(members[1]).toEqual({
      vanId: '789012',
      name: 'Sarah Johnson',
      preferredEmail: 'sarah@example.com'
    });
    expect(members[2]).toEqual({
      vanId: '345678',
      name: 'Michael Davis',
      preferredEmail: 'mike@example.com'
    });
  });

  test('should handle nickname matching with UTF-16 encoded member list', () => {
    // Simulate the Donald/Don scenario with fictional data
    const utf16EncodedContent = `V A N I D \t N a m e \t E m a i l  
5 5 5 6 6 6 \t R o b e r t   W i l s o n \t r o b @ e x a m p l e . c o m  
7 7 7 8 8 8 \t M i c h a e l   D a v i s \t m i k e @ e x a m p l e . c o m  `;

    const members = parseMemberList(utf16EncodedContent);
    
    // Vote with shortened name but matching email
    const votes: Vote[] = [
      {
        username: 'Bob Wilson', // Nickname instead of "Robert Wilson"
        email: 'rob@example.com', // Same email
        time: '2025-06-15 12:00:00',
        choice: 'Yes'
      },
      {
        username: 'Mike Davis', // Nickname instead of "Michael Davis"
        email: 'mike@example.com', // Same email
        time: '2025-06-15 12:05:00',
        choice: 'No'
      }
    ];
    
    const result = validateVotes(votes, members);
    
    // Both votes should be valid because emails match
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
    
    // Verify specific matches
    expect(result.valid[0].username).toBe('Bob Wilson');
    expect(result.valid[1].username).toBe('Mike Davis');
  });

  test('should handle normal UTF-8 encoded content without issues', () => {
    // Normal content should still work
    const normalContent = `VANID\tName\tEmail
123456\tAlice Brown\talice@example.com
789012\tBob Green\tbob@example.com`;

    const members = parseMemberList(normalContent);
    
    expect(members).toHaveLength(2);
    expect(members[0]).toEqual({
      vanId: '123456',
      name: 'Alice Brown',
      preferredEmail: 'alice@example.com'
    });
    expect(members[1]).toEqual({
      vanId: '789012',
      name: 'Bob Green',
      preferredEmail: 'bob@example.com'
    });
  });

  test('should handle mixed spacing patterns', () => {
    // Edge case with inconsistent spacing - normal content in UTF-16 file
    const mixedContent = `V A N I D \t N a m e \t E m a i l  
1 2 3 4 5 6 \t A l i c e   W h i t e \t a l i c e @ e x a m p l e . c o m  
7 8 9 0 1 2 \t N o r m a l   N a m e \t n o r m a l @ e x a m p l e . c o m  
9 9 9 0 0 0 \t C h a r l i e   B l a c k \t c h a r l i e @ e x a m p l e . c o m  `;

    const members = parseMemberList(mixedContent);
    
    expect(members).toHaveLength(3);
    expect(members[0].name).toBe('Alice White');
    expect(members[1].name).toBe('Normal Name');
    expect(members[2].name).toBe('Charlie Black');
  });
});