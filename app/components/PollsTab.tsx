import React, { useState } from 'react';
import { MaterialReactTable } from 'material-react-table';
import styles from '../styles/PollsTab.module.css';
import { VoteSummary } from './VoteSummary';
import { type Vote } from '../vote-verification';

interface CategorizedVotes {
  validVotes: Vote[];
  invalidVotes: Vote[];
  duplicateVotes: Vote[];
}

interface PollResult {
  name: string;
  question: string;
  votes: Vote[];
  categorizedVotes: CategorizedVotes;
  choiceToVotes: Map<string, number>;
}

interface PollsTabProps {
  pollResults: PollResult[];
  onPollUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  hasMemberData: boolean;
  onCreateAlias: (username: string) => void;
}

export const PollsTab: React.FC<PollsTabProps> = ({
  pollResults,
  onPollUpload,
  hasMemberData,
  onCreateAlias
}) => {
  const [expandedVotes, setExpandedVotes] = useState<{[key: string]: {invalid: boolean, duplicate: boolean}}>({});

  const toggleVoteList = (pollName: string, type: 'invalid' | 'duplicate') => {
    setExpandedVotes(prev => ({
      ...prev,
      [pollName]: {
        ...prev[pollName] || {},
        [type]: !(prev[pollName]?.[type] ?? false)
      }
    }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <input 
          type="file" 
          accept=".csv" 
          onChange={onPollUpload}
          disabled={!hasMemberData}
          className={styles.fileInput}
          data-testid="file-input"
        />
        {!hasMemberData && (
          <p className={styles.warning}>
            Please upload member data first before uploading poll results.
          </p>
        )}
      </div>

      {pollResults.map((poll, index) => (
        <div key={index} className={styles.pollContainer}>
          <VoteSummary
            name={poll.name}
            question={poll.question}
            choiceToVotes={poll.choiceToVotes}
            totalVotes={poll.votes.length}
            validVotes={poll.categorizedVotes.validVotes.length}
            invalidVotes={poll.categorizedVotes.invalidVotes.length}
            duplicateVotes={poll.categorizedVotes.duplicateVotes.length}
          />

          {poll.categorizedVotes.invalidVotes.length > 0 && (
            <div className={styles.voteListSection}>
              <button
                onClick={() => toggleVoteList(poll.name, 'invalid')}
                className={`${styles.toggleButton} ${expandedVotes[poll.name]?.invalid ? styles.active : ''}`}
              >
                <span>Invalid Votes</span>
                <span className={styles.count}>
                  {poll.categorizedVotes.invalidVotes.length}
                </span>
                <span className={`${styles.arrow} ${expandedVotes[poll.name]?.invalid ? styles.up : ''}`}>
                  ▼
                </span>
              </button>

              {expandedVotes[poll.name]?.invalid && (
                <MaterialReactTable
                  columns={[
                    { header: "Username", accessorKey: "username" },
                    { header: "Email", accessorKey: "email" },
                    { header: "Time", accessorKey: "time" },
                    { header: "Choice", accessorKey: "choice" },
                    {
                      header: "Actions",
                      accessorKey: "actions",
                      Cell: ({ row }) => (
                        <button 
                          onClick={() => onCreateAlias(row.original.username)}
                          className={styles.createAliasButton}
                        >
                          Create Alias
                        </button>
                      )
                    }
                  ]}
                  data={poll.categorizedVotes.invalidVotes}
                />
              )}
            </div>
          )}

          {poll.categorizedVotes.duplicateVotes.length > 0 && (
            <div className={styles.voteListSection}>
              <button
                onClick={() => toggleVoteList(poll.name, 'duplicate')}
                className={`${styles.toggleButton} ${expandedVotes[poll.name]?.duplicate ? styles.active : ''}`}
              >
                <span>Duplicate Votes</span>
                <span className={styles.count}>
                  {poll.categorizedVotes.duplicateVotes.length}
                </span>
                <span className={`${styles.arrow} ${expandedVotes[poll.name]?.duplicate ? styles.up : ''}`}>
                  ▼
                </span>
              </button>

              {expandedVotes[poll.name]?.duplicate && (
                <MaterialReactTable
                  columns={[
                    { header: "Username", accessorKey: "username" },
                    { header: "Email", accessorKey: "email" },
                    { header: "Time", accessorKey: "time" },
                    { header: "Choice", accessorKey: "choice" }
                  ]}
                  data={poll.categorizedVotes.duplicateVotes}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
