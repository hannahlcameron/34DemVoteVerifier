import React, { useState, useEffect } from 'react';
import { MaterialReactTable } from 'material-react-table';
import styles from '../styles/PollsTab.module.css';
import { VoteSummary } from './VoteSummary';
import { type Vote } from '../vote-verification';
import { useZoomIntegration } from '../hooks/useZoomIntegration';

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
  onZoomPollsLoaded?: (polls: any[]) => void;
}

export const PollsTab: React.FC<PollsTabProps> = ({
  pollResults,
  onPollUpload,
  hasMemberData,
  onCreateAlias,
  onZoomPollsLoaded
}) => {
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);
  const [selectedVoteView, setSelectedVoteView] = useState<'total' | 'valid' | 'invalid' | 'duplicate' | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'zoom'>('file');
  const [showMeetingList, setShowMeetingList] = useState(false);
  
  const { 
    isAuthenticated, 
    isLoading, 
    meetings, 
    error, 
    initiateLogin, 
    fetchMeetings, 
    fetchPollData 
  } = useZoomIntegration();

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

  const handleZoomConnect = async () => {
    if (isAuthenticated) {
      setShowMeetingList(true);
      await fetchMeetings();
    } else {
      await initiateLogin();
    }
  };

  const handleMeetingSelect = async (meetingId: string) => {
    try {
      const pollData = await fetchPollData(meetingId);
      if (onZoomPollsLoaded) {
        onZoomPollsLoaded(pollData);
      }
      setShowMeetingList(false);
    } catch (error) {
      console.error('Failed to load poll data:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <div className={styles.uploadMethodToggle}>
          <button 
            className={`${styles.toggleMethodButton} ${uploadMethod === 'file' ? styles.active : ''}`}
            onClick={() => setUploadMethod('file')}
          >
            Upload File
          </button>
          <button 
            className={`${styles.toggleMethodButton} ${uploadMethod === 'zoom' ? styles.active : ''}`}
            onClick={() => setUploadMethod('zoom')}
          >
            Select Zoom Meeting
          </button>
        </div>

        {uploadMethod === 'file' ? (
          <div className={styles.fileUploadSection}>
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
        ) : (
          <div className={styles.zoomSection}>
            {!showMeetingList ? (
              <>
                <button 
                  className={styles.zoomLoginButton}
                  disabled={!hasMemberData || isLoading}
                  onClick={handleZoomConnect}
                >
                  {isLoading ? 'Loading...' : (isAuthenticated ? 'Select Meeting' : 'Connect to Zoom')}
                </button>
                {!hasMemberData && (
                  <p className={styles.warning}>
                    Please upload member data first before connecting to Zoom.
                  </p>
                )}
                {error && (
                  <p className={styles.warning}>
                    {error}
                  </p>
                )}
                <p className={styles.zoomInfo}>
                  Connect to your Zoom account to select meetings with poll data.
                  {error && error.includes('not configured') && (
                    <br />
                    <strong>Note:</strong> Zoom integration requires setup by an administrator.
                  )}
                </p>
              </>
            ) : (
              <div className={styles.meetingListSection}>
                <div className={styles.meetingListHeader}>
                  <h3>Select a Meeting</h3>
                  <button 
                    onClick={() => setShowMeetingList(false)}
                    className={styles.closeButton}
                  >
                    ✕
                  </button>
                </div>
                
                {isLoading ? (
                  <p>Loading meetings...</p>
                ) : meetings.length === 0 ? (
                  <p>No meetings found with poll data in the last 30 days.</p>
                ) : (
                  <div className={styles.meetingList}>
                    {meetings.map((meeting) => (
                      <div 
                        key={meeting.id}
                        className={styles.meetingItem}
                        onClick={() => handleMeetingSelect(meeting.uuid)}
                      >
                        <div className={styles.meetingInfo}>
                          <h4 className={styles.meetingTitle}>{meeting.topic}</h4>
                          <p className={styles.meetingDate}>
                            {new Date(meeting.start_time).toLocaleDateString()} at {new Date(meeting.start_time).toLocaleTimeString()}
                          </p>
                          <p className={styles.meetingDuration}>
                            Duration: {meeting.duration} minutes
                          </p>
                        </div>
                        <div className={styles.meetingPolls}>
                          {meeting.has_polls ? (
                            <span className={styles.pollsBadge}>
                              {meeting.poll_count} {meeting.poll_count === 1 ? 'Poll' : 'Polls'}
                            </span>
                          ) : (
                            <span className={styles.noPollsBadge}>No Polls</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
