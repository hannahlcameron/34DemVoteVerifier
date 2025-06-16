import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  const samplePollResults = [
    {
      name: 'Test Poll',
      question: 'Test Question',
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
    }
  ];

  const defaultProps = {
    pollResults: [],
    onPollUpload: mockOnPollUpload,
    hasMemberData: true,
    onCreateAlias: mockOnCreateAlias
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
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll',
        question: 'Test Question',
        totalVotes: 2,
        validVotes: 1,
        invalidVotes: 1,
        duplicateVotes: 1
      }),
      expect.any(Object)
    );
  });

  it('toggles invalid votes list', () => {
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
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
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
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
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
    // Show invalid votes table
    fireEvent.click(screen.getByText('Invalid Votes'));
    
    // Get the MaterialReactTable call arguments
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    
    // Find the actions column
    const actionsColumn = mockTableCall.columns.find((col: { accessorKey: string }) => col.accessorKey === 'actions');
    expect(actionsColumn).toBeDefined();
    
    // Simulate clicking create alias button
    const CellComponent = actionsColumn.Cell;
    render(<CellComponent row={{ original: { username: 'invalid' } }} />);
    
    fireEvent.click(screen.getByText('Create Alias'));
    expect(mockOnCreateAlias).toHaveBeenCalledWith('invalid');
  });

  it('passes correct props to VoteSummary', () => {
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
    expect(VoteSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Poll',
        question: 'Test Question',
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
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
    fireEvent.click(screen.getByText('Invalid Votes'));
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns).toHaveLength(5); // Username, Email, Time, Choice, Actions
    expect(columns[0].header).toBe('Username');
    expect(columns[1].header).toBe('Email');
    expect(columns[2].header).toBe('Time');
    expect(columns[3].header).toBe('Choice');
    expect(columns[4].header).toBe('Actions');
  });

  it('renders correct table columns for duplicate votes', () => {
    render(<PollsTab {...defaultProps} pollResults={samplePollResults} />);
    
    fireEvent.click(screen.getByText('Duplicate Votes'));
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns).toHaveLength(4); // Username, Email, Time, Choice (no Actions)
    expect(columns[0].header).toBe('Username');
    expect(columns[1].header).toBe('Email');
    expect(columns[2].header).toBe('Time');
    expect(columns[3].header).toBe('Choice');
  });
});
