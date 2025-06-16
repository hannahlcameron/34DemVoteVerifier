import React, { useState, useEffect } from 'react';
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
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);

  // Reset selected poll when poll results change
  useEffect(() => {
    if (pollResults.length > 0) {
      setSelectedPollIndex(0);
    }
  }, [pollResults]);

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

      {pollResults.length > 0 && (
        <div className={styles.pollsContent}>
          {/* Poll Navigation Sidebar */}
          <div className={styles.pollNavigation} data-testid="poll-navigation">
            <ul>
              {pollResults.map((poll, index) => (
                <li 
                  key={index} 
                  className={`${styles.pollNavItem} ${selectedPollIndex === index ? styles.active : ''}`}
                  onClick={() => setSelectedPollIndex(index)}
                >
                  <div className={styles.pollNavHeader}>
                    <span className={styles.pollNumber}>Poll #{index + 1}</span>
                    <div className={styles.pollNavBadges}>
                    {poll.categorizedVotes.validVotes.length > 0 && (
                      <span className={`${styles.badge} ${styles.validBadge}`} title="Valid votes">
                        <span className={styles.badgeIcon}>✓</span>
                        {poll.categorizedVotes.validVotes.length}
                      </span>
                    )}
                    {poll.categorizedVotes.duplicateVotes.length > 0 && (
                      <span className={`${styles.badge} ${styles.duplicateBadge}`} title="Duplicate votes">
                        <span className={styles.badgeIcon}>⚠</span>
                        {poll.categorizedVotes.duplicateVotes.length}
                      </span>
                    )}
                    {poll.categorizedVotes.invalidVotes.length > 0 && (
                      <span className={`${styles.badge} ${styles.invalidBadge}`} title="Invalid votes">
                        <span className={styles.badgeIcon}>✗</span>
                        {poll.categorizedVotes.invalidVotes.length}
                      </span>
                    )}
                    </div>
                  </div>
                  <div className={styles.pollNavName}>
                    <span className={styles.pollTitle}>{poll.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Poll Content */}
          <div className={styles.pollContent}>
            {pollResults.length > selectedPollIndex && (
              <div className={styles.pollContainer}>
                <VoteSummary
                  name={pollResults[selectedPollIndex].name}
                  question={pollResults[selectedPollIndex].question}
                  choiceToVotes={pollResults[selectedPollIndex].choiceToVotes}
                  totalVotes={pollResults[selectedPollIndex].votes.length}
                  validVotes={pollResults[selectedPollIndex].categorizedVotes.validVotes.length}
                  invalidVotes={pollResults[selectedPollIndex].categorizedVotes.invalidVotes.length}
                  duplicateVotes={pollResults[selectedPollIndex].categorizedVotes.duplicateVotes.length}
                />

                {pollResults[selectedPollIndex].categorizedVotes.invalidVotes.length > 0 && (
                  <div className={styles.voteListSection}>
                    <button
                      onClick={() => toggleVoteList(pollResults[selectedPollIndex].name, 'invalid')}
                      className={`${styles.toggleButton} ${expandedVotes[pollResults[selectedPollIndex].name]?.invalid ? styles.active : ''}`}
                    >
                      <span>Invalid Votes</span>
                      <span className={styles.count}>
                        {pollResults[selectedPollIndex].categorizedVotes.invalidVotes.length}
                      </span>
                      <span className={`${styles.arrow} ${expandedVotes[pollResults[selectedPollIndex].name]?.invalid ? styles.up : ''}`}>
                        ▼
                      </span>
                    </button>

                    {expandedVotes[pollResults[selectedPollIndex].name]?.invalid && (
                      <MaterialReactTable
                        columns={[
                          {
                            header: "Actions",
                            id: "actions",
                            size: 100,
                            Cell: ({ row }) => (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateAlias(row.original.username);
                                }}
                                className={styles.createAliasButton}
                              >
                                Create Alias
                              </button>
                            )
                          },
                          {
                            header: "Username",
                            accessorKey: "username",
                            Cell: ({ cell }) => (
                              <div className={styles.usernameCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          },
                          { 
                            header: "Email", 
                            accessorKey: "email",
                            Cell: ({ cell }) => (
                              <div className={styles.emailCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          },
                          { 
                            header: "Choice", 
                            accessorKey: "choice",
                            Cell: ({ cell }) => (
                              <div className={styles.choiceCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          }
                        ]}
                        data={pollResults[selectedPollIndex].categorizedVotes.invalidVotes}
                        enableColumnResizing
                        layoutMode="grid"
                        muiTableContainerProps={{ 
                          sx: { maxHeight: '400px' } 
                        }}
                      />
                    )}
                  </div>
                )}

                {pollResults[selectedPollIndex].categorizedVotes.duplicateVotes.length > 0 && (
                  <div className={styles.voteListSection}>
                    <button
                      onClick={() => toggleVoteList(pollResults[selectedPollIndex].name, 'duplicate')}
                      className={`${styles.toggleButton} ${expandedVotes[pollResults[selectedPollIndex].name]?.duplicate ? styles.active : ''}`}
                    >
                      <span>Duplicate Votes</span>
                      <span className={styles.count}>
                        {pollResults[selectedPollIndex].categorizedVotes.duplicateVotes.length}
                      </span>
                      <span className={`${styles.arrow} ${expandedVotes[pollResults[selectedPollIndex].name]?.duplicate ? styles.up : ''}`}>
                        ▼
                      </span>
                    </button>

                    {expandedVotes[pollResults[selectedPollIndex].name]?.duplicate && (
                      <MaterialReactTable
                        columns={[
                          { 
                            header: "Username", 
                            accessorKey: "username",
                            Cell: ({ cell }) => (
                              <div className={styles.usernameCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          },
                          { 
                            header: "Email", 
                            accessorKey: "email",
                            Cell: ({ cell }) => (
                              <div className={styles.emailCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          },
                          { 
                            header: "Choice", 
                            accessorKey: "choice",
                            Cell: ({ cell }) => (
                              <div className={styles.choiceCell}>
                                {cell.getValue() as string}
                              </div>
                            )
                          }
                        ]}
                        data={pollResults[selectedPollIndex].categorizedVotes.duplicateVotes}
                        enableColumnResizing
                        layoutMode="grid"
                        muiTableContainerProps={{ 
                          sx: { maxHeight: '400px' } 
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
