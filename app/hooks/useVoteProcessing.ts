import { useState } from 'react';
import { 
  type Member,
  type Vote,
  parseMemberList,
  parseVoteData,
  validateVotes,
  getDuplicateVotes
} from '../vote-verification';

export interface CategorizedVotes {
  validVotes: Vote[];
  invalidVotes: Vote[];
  duplicateVotes: Vote[];
}

export interface PollResult {
  name: string;
  question: string;
  votes: Vote[];
  categorizedVotes: CategorizedVotes;
  choiceToVotes: Map<string, number>;
}

export function useVoteProcessing() {
  const [memberData, setMemberData] = useState<Member[]>([]);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);

  const summarizeVotes = (votes: Vote[]) => {
    const summary = new Map<string, number>();
    votes.forEach(vote => {
      const existing = summary.get(vote.choice) || 0;
      summary.set(vote.choice, existing + 1);
    });
    return summary;
  };

  const validateAndParseMemberList = (tsv: string): Member[] | { error: string } => {
    const lines = tsv.trim().split("\n");
    if (lines.length < 2) {
      return { error: "File must contain at least a header line and one data line" };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split("\t");
      
      if (values.length < 1) {
        return {
          error: `Invalid format on line ${i + 1}:\n` +
                `"${line}"\n\n` +
                `Expected at least VANID, with optional Name and Email.\n` +
                `Example of correct format:\n` +
                `123456789\tBig Bird\tbird@sesamestreet.org`
        };
      }
    }

    return parseMemberList(tsv);
  };

  const handleMembersUpload = (file: File): Promise<void> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const tsv = e.target?.result as string;
        const result = validateAndParseMemberList(tsv);
        
        if ('error' in result) {
          reject(new Error(result.error));
          return;
        }
        
        setMemberData(result);
        
        if (pollResults.length > 0) {
          const updatedPollResults = pollResults.map(poll => {
            const validationResult = validateVotes(poll.votes, result);
            const duplicates = getDuplicateVotes(validationResult);
            const categorizedVotes = {
              validVotes: validationResult.valid,
              invalidVotes: validationResult.invalid,
              duplicateVotes: duplicates
            };
            return {
              ...poll,
              categorizedVotes,
              choiceToVotes: summarizeVotes(categorizedVotes.validVotes)
            };
          });
          setPollResults(updatedPollResults);
        }
        resolve();
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

  const processVotes = (votes: Vote[], pollName: string = "Vote Results", question: string = "") => {
    const validationResult = validateVotes(votes, memberData);
    const duplicates = getDuplicateVotes(validationResult);
    
    const categorizedVotes = {
      validVotes: validationResult.valid,
      invalidVotes: validationResult.invalid,
      duplicateVotes: duplicates
    };

    setPollResults([{
      name: pollName,
      question: question,
      votes: votes,
      categorizedVotes,
      choiceToVotes: summarizeVotes(categorizedVotes.validVotes)
    }]);
  };

  const processMultiplePolls = (pollResults: Array<{name: string, question: string, votes: Vote[]}>) => {
    const processedPolls = pollResults.map(poll => {
      const validationResult = validateVotes(poll.votes, memberData);
      const duplicates = getDuplicateVotes(validationResult);
      
      const categorizedVotes = {
        validVotes: validationResult.valid,
        invalidVotes: validationResult.invalid,
        duplicateVotes: duplicates
      };

      return {
        name: poll.name,
        question: poll.question,
        votes: poll.votes,
        categorizedVotes,
        choiceToVotes: summarizeVotes(categorizedVotes.validVotes)
      };
    });

    setPollResults(processedPolls);
  };

  const handlePollUpload = (input: File | Vote[]): Promise<void> => {
    if (Array.isArray(input)) {
      processVotes(input);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        try {
          // Import the parseCSVVotes function directly to get multiple poll results
          const { parseCSVVotes } = require('../vote-verification');
          const result = parseCSVVotes(csv);
          
          if ('error' in result) {
            reject(new Error(result.error));
            return;
          }
          
          // If we have multiple polls, process them
          if (Array.isArray(result) && result.length > 0) {
            processMultiplePolls(result);
          } else {
            // Fallback to the old method if something goes wrong
            const votes = parseVoteData(csv);
            processVotes(votes);
          }
          
          resolve();
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Failed to parse vote data'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(input);
    });
  };

  const resetData = () => {
    setMemberData([]);
    setPollResults([]);
  };

  return {
    memberData,
    pollResults,
    handleMembersUpload,
    handlePollUpload,
    resetData
  };
}
