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
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);
  const [selectedVoteView, setSelectedVoteView] = useState<'total' | 'valid' | 'invalid' | 'duplicate' | null>(null);

  // Reset selected poll when poll results change
  useEffect(() => {
    if (pollResults.length > 0) {
      setSelectedPollIndex(0);
    }
  }, [pollResults]);

  const handleViewVotes = (category: 'total' | 'valid' | 'invalid' | 'duplicate') => {
    setSelectedVoteView(selectedVoteView === category ? null : category);
  };

  const getCurrentVotes = () => {
    if (!pollResults[selectedPollIndex] || !selectedVoteView) return [];
    
    const poll = pollResults[selectedPollIndex];
    switch (selectedVoteView) {
      case 'total':
        return poll.votes;
      case 'valid':
        return poll.categorizedVotes.validVotes;
      case 'invalid':
        return poll.categorizedVotes.invalidVotes;
      case 'duplicate':
        return poll.categorizedVotes.duplicateVotes;
      default:
        return [];
    }
  };

  const getTableTitle = () => {
    if (!selectedVoteView) return '';
    return `${selectedVoteView.charAt(0).toUpperCase() + selectedVoteView.slice(1)} Votes`;
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
                  onViewVotes={handleViewVotes}
                />

                {selectedVoteView && (
                  <div className={styles.voteTableSection}>
                    <div className={styles.tableHeader}>
                      <h3 className={styles.tableTitle}>{getTableTitle()}</h3>
                      <button
                        onClick={() => setSelectedVoteView(null)}
                        className={styles.closeButton}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <MaterialReactTable
                      columns={[
                        ...(selectedVoteView === 'invalid' ? [{
                          header: "Actions",
                          id: "actions",
                          size: 100,
                          Cell: ({ row }: any) => (
                            <button 
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onCreateAlias(row.original.username);
                              }}
                              className={styles.createAliasButton}
                            >
                              Create Alias
                            </button>
                          )
                        }] : []),
                        {
                          header: "Username",
                          accessorKey: "username",
                          Cell: ({ cell }: any) => (
                            <div className={styles.usernameCell}>
                              {cell.getValue() as string}
                            </div>
                          )
                        },
                        { 
                          header: "Email", 
                          accessorKey: "email",
                          Cell: ({ cell }: any) => (
                            <div className={styles.emailCell}>
                              {cell.getValue() as string}
                            </div>
                          )
                        },
                        { 
                          header: "Choice", 
                          accessorKey: "choice",
                          Cell: ({ cell }: any) => (
                            <div className={styles.choiceCell}>
                              {cell.getValue() as string}
                            </div>
                          )
                        }
                      ]}
                      data={getCurrentVotes()}
                      enableColumnResizing
                      layoutMode="grid"
                      muiTableContainerProps={{ 
                        sx: { maxHeight: '500px' } 
                      }}
                      initialState={{
                        density: 'compact'
                      }}
                    />
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
