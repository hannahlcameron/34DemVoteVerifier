import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PollsTab } from '../../app/components/PollsTab';
import { MaterialReactTable } from 'material-react-table';
import { VoteSummary } from '../../app/components/VoteSummary';

// Mock MaterialReactTable
jest.mock('material-react-table', () => ({
  MaterialReactTable: jest.fn(() => <div data-testid="mock-table" />)
}));

// Mock VoteSummary
jest.mock('../../app/components/VoteSummary', () => ({
  VoteSummary: jest.fn(() => <div data-testid="mock-vote-summary" />)
}));

describe('PollsTab', () => {
  const mockOnPollUpload = jest.fn();
  const mockOnCreateAlias = jest.fn();

  const defaultProps = {
    pollResults: [],
    onPollUpload: mockOnPollUpload,
    hasMemberData: true,
    onCreateAlias: mockOnCreateAlias
  };

  const samplePollResults = [
    {
      name: 'Test Poll 1',
      question: 'Test Question 1',
      votes: [
        { username: 'user1', email: 'user1@test.com', time: '2025-06-14', choice: 'Yes' },
        { username: 'user2', email: 'user2@test.com', time: '2025-06-14', choice: 'No' }
      ],
      categorizedVotes: {
        validVotes: [{ username: 'user1', email: 'user1@test.com', time: '2025-06-14', choice: 'Yes' }],
        invalidVotes: [{ username: 'invalid', email: 'invalid@test.com', time: '2025-06-14', choice: 'Yes' }],
        duplicateVotes: [{ username: 'duplicate', email: 'duplicate@test.com', time: '2025-06-14', choice: 'Yes' }]
      },
      choiceToVotes: new Map([['Yes', 2], ['No', 1]])
    },
    {
      name: 'Test Poll 2',
      question: 'Test Question 2',
      votes: [
        { username: 'user3', email: 'user3@test.com', time: '2025-06-14', choice: 'Option A' },
        { username: 'user4', email: 'user4@test.com', time: '2025-06-14', choice: 'Option B' }
      ],
      categorizedVotes: {
        validVotes: [{ username: 'user3', email: 'user3@test.com', time: '2025-06-14', choice: 'Option A' }],
        invalidVotes: [{ username: 'invalid2', email: 'invalid2@test.com', time: '2025-06-14', choice: 'Option A' }],
        duplicateVotes: []
      },
      choiceToVotes: new Map([['Option A', 1], ['Option B', 1]])
    },
    {
      name: 'Test Poll 3',
      question: 'Test Question 3',
      votes: [
        { username: 'user5', email: 'user5@test.com', time: '2025-06-14', choice: 'Approve' },
        { username: 'user6', email: 'user6@test.com', time: '2025-06-14', choice: 'Reject' }
      ],
      categorizedVotes: {
        validVotes: [
          { username: 'user5', email: 'user5@test.com', time: '2025-06-14', choice: 'Approve' },
          { username: 'user6', email: 'user6@test.com', time: '2025-06-14', choice: 'Reject' }
        ],
        invalidVotes: [],
        duplicateVotes: []
      },
      choiceToVotes: new Map([['Approve', 1], ['Reject', 1]])
    }
  ];

  const multiplePollsProps = {
    ...defaultProps,
    pollResults: samplePollResults
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file upload input', () => {
    render(<PollsTab {...defaultProps} />);
    
    const fileInput = screen.getByTestId('file-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.csv');
  });

  it('disables file upload when no member data', () => {
    render(<PollsTab {...defaultProps} hasMemberData={false} />);
    
    const fileInput = screen.getByTestId('file-input');
    expect(fileInput).toBeDisabled();
    expect(screen.getByText(/Please upload member data first/)).toBeInTheDocument();
  });

  it('handles file upload', () => {
    render(<PollsTab {...defaultProps} />);
    
    const file = new File(['test content'], 'test.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockOnPollUpload).toHaveBeenCalled();
  });

  it('renders poll results', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll 1',
        question: 'Test Question 1',
        totalVotes: 2,
        validVotes: 1,
        invalidVotes: 1,
        duplicateVotes: 1
      }),
      expect.any(Object)
    );
  });

  it('toggles invalid votes list', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    const invalidVotesButton = screen.getByText('Invalid Votes');
    
    // Initially table should not be visible
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(0);
    
    // Click to show table
    fireEvent.click(invalidVotesButton);
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(1);
    
    // Click again to hide table
    fireEvent.click(invalidVotesButton);
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(0);
  });

  it('toggles duplicate votes list', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    const duplicateVotesButton = screen.getByText('Duplicate Votes');
    
    // Initially table should not be visible
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(0);
    
    // Click to show table
    fireEvent.click(duplicateVotesButton);
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(1);
    
    // Click again to hide table
    fireEvent.click(duplicateVotesButton);
    expect(screen.queryAllByTestId('mock-table')).toHaveLength(0);
  });

  it('handles create alias action', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    // Show invalid votes table
    fireEvent.click(screen.getByText('Invalid Votes'));
    
    // Get the MaterialReactTable call arguments
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    
    // Find the actions column which now contains the create alias button
    const actionsColumn = mockTableCall.columns.find((col: any) => col.id === 'actions' || col.accessorKey === 'actions');
    expect(actionsColumn).toBeDefined();
    
    // Simulate clicking create alias button
    const CellComponent = actionsColumn.Cell;
    render(<CellComponent row={{ original: { username: 'invalid' } }} />);
    
    fireEvent.click(screen.getByText('Create Alias'));
    expect(mockOnCreateAlias).toHaveBeenCalledWith('invalid');
  });

  it('passes correct props to VoteSummary', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll 1',
        question: 'Test Question 1',
        choiceToVotes: samplePollResults[0].choiceToVotes,
        totalVotes: 2,
        validVotes: 1,
        invalidVotes: 1,
        duplicateVotes: 1
      }),
      expect.any(Object)
    );
  });

  it('renders correct table columns for invalid votes', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    fireEvent.click(screen.getByText('Invalid Votes'));
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns).toHaveLength(4); // Actions, Username, Email, Choice
    expect(columns[0].header).toBe('Actions');
    expect(columns[1].header).toBe('Username');
    expect(columns[2].header).toBe('Email');
    expect(columns[3].header).toBe('Choice');
  });

  it('renders correct table columns for duplicate votes', () => {
    render(<PollsTab {...defaultProps} pollResults={[samplePollResults[0]]} />);
    
    fireEvent.click(screen.getByText('Duplicate Votes'));
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns).toHaveLength(3); // Username, Email, Choice
    expect(columns[0].header).toBe('Username');
    expect(columns[1].header).toBe('Email');
    expect(columns[2].header).toBe('Choice');
  });

  // New tests for poll navigation
  it('renders poll navigation sidebar with multiple polls', () => {
    render(<PollsTab {...multiplePollsProps} />);
    
    // Check if poll navigation is rendered
    const pollNav = screen.getByTestId('poll-navigation');
    expect(pollNav).toBeInTheDocument();
    
    // Check if all poll numbers and names are in the navigation
    expect(screen.getByText('Poll #1')).toBeInTheDocument();
    expect(screen.getByText('Test Poll 1')).toBeInTheDocument();
    expect(screen.getByText('Poll #2')).toBeInTheDocument();
    expect(screen.getByText('Test Poll 2')).toBeInTheDocument();
    expect(screen.getByText('Poll #3')).toBeInTheDocument();
    expect(screen.getByText('Test Poll 3')).toBeInTheDocument();
  });

  it('displays poll items without badges', () => {
    render(<PollsTab {...multiplePollsProps} />);
    
    // Check if poll items are displayed
    const poll1Item = screen.getByText('Test Poll 1').closest('li');
    const poll2Item = screen.getByText('Test Poll 2').closest('li');
    const poll3Item = screen.getByText('Test Poll 3').closest('li');
    
    // Verify poll items exist
    expect(poll1Item).toBeInTheDocument();
    expect(poll2Item).toBeInTheDocument();
    expect(poll3Item).toBeInTheDocument();
    
    // Verify poll numbers are displayed
    expect(within(poll1Item!).getByText('Poll #1')).toBeInTheDocument();
    expect(within(poll2Item!).getByText('Poll #2')).toBeInTheDocument();
    expect(within(poll3Item!).getByText('Poll #3')).toBeInTheDocument();
  });

  it('selects first poll by default', () => {
    render(<PollsTab {...multiplePollsProps} />);
    
    // First poll should be selected by default
    const poll1Item = screen.getByText('Test Poll 1').closest('li');
    expect(poll1Item).toHaveClass('active');
    
    // First poll's content should be visible
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll 1',
        question: 'Test Question 1'
      }),
      expect.any(Object)
    );
  });

  it('changes selected poll when clicking on navigation item', () => {
    render(<PollsTab {...multiplePollsProps} />);
    
    // Click on second poll
    fireEvent.click(screen.getByText('Test Poll 2'));
    
    // Second poll should be selected
    const poll2Item = screen.getByText('Test Poll 2').closest('li');
    expect(poll2Item).toHaveClass('active');
    
    // Second poll's content should be visible
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll 2',
        question: 'Test Question 2'
      }),
      expect.any(Object)
    );
  });

  it('only shows the selected poll content', () => {
    render(<PollsTab {...multiplePollsProps} />);
    
    // Initially first poll is selected
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Poll 1' }),
      expect.any(Object)
    );
    
    // Reset mock to check next call
    (VoteSummary as jest.Mock).mockClear();
    
    // Click on third poll
    fireEvent.click(screen.getByText('Test Poll 3'));
    
    // Only third poll should be visible
    expect(VoteSummary).toHaveBeenCalledTimes(1);
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Poll 3' }),
      expect.any(Object)
    );
  });
});
