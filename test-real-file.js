// This is a simple script to test our vote-verification.ts with a real file
const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript version of our TypeScript code
const { parseCSVVotes } = require('./app/vote-verification');

// Path to the real Zoom poll file
const filePath = path.resolve(__dirname, '../../Downloads/86042421495 - Poll Report (14).csv');

try {
  // Read the file
  const csv = fs.readFileSync(filePath, 'utf8');
  
  // Parse the CSV
  const result = parseCSVVotes(csv);
  
  if ('error' in result) {
    console.error('Error parsing CSV:', result.error);
  } else {
    console.log(`Successfully parsed ${result.length} polls:`);
    result.forEach((poll, index) => {
      console.log(`${index + 1}. ${poll.name} - ${poll.votes.length} votes`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
