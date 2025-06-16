import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AliasesTab } from '../../app/components/AliasesTab';
import { MaterialReactTable } from 'material-react-table';
import { AliasModal } from '../../app/components/AliasModal';

// Mock MaterialReactTable
jest.mock('material-react-table', () => ({
  MaterialReactTable: jest.fn(() => <div data-testid="mock-table" />)
}));

// Mock AliasModal
jest.mock('../../app/components/AliasModal', () => ({
  AliasModal: jest.fn(() => <div data-testid="mock-modal" />)
}));

describe('AliasesTab', () => {
  const mockOnCreateAlias = jest.fn();
  const mockOnResetAliases = jest.fn();

  const sampleMemberData = [
    {
      vanId: '123456',
      name: 'John Doe',
      preferredEmail: 'john@example.com'
    },
    {
      vanId: '789012',
      name: 'Jane Smith',
      preferredEmail: 'jane@example.com'
    }
  ];

  const sampleAliases = [
    {
      vanId: '123456',
      alias: 'Johnny'
    },
    {
      vanId: '789012',
      alias: 'Janey'
    }
  ];

  const defaultProps = {
    aliases: [],
    memberData: sampleMemberData,
    onCreateAlias: mockOnCreateAlias,
    onResetAliases: mockOnResetAliases
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no aliases exist', () => {
    render(<AliasesTab {...defaultProps} />);
    
    expect(screen.getByText('No aliases created yet!')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-table')).not.toBeInTheDocument();
  });

  it('renders table when aliases exist', () => {
    render(<AliasesTab {...defaultProps} aliases={sampleAliases} />);
    
    expect(screen.queryByText('No aliases created yet!')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-table')).toBeInTheDocument();
  });

  it('renders Add New Alias and Reset Aliases buttons', () => {
    render(<AliasesTab {...defaultProps} />);
    
    expect(screen.getByText('Add New Alias')).toBeInTheDocument();
    expect(screen.getByText('Reset Aliases')).toBeInTheDocument();
  });

  it('opens modal when clicking Add New Alias', () => {
    render(<AliasesTab {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add New Alias'));
    
    expect(AliasModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        prefilledAlias: ''
      }),
      expect.any(Object)
    );
  });

  it('calls onResetAliases when clicking Reset Aliases', () => {
    render(<AliasesTab {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Reset Aliases'));
    
    expect(mockOnResetAliases).toHaveBeenCalled();
  });

  it('configures table columns correctly', () => {
    render(<AliasesTab {...defaultProps} aliases={sampleAliases} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns).toHaveLength(3);
    expect(columns[0].header).toBe('VanID');
    expect(columns[1].header).toBe('Alias');
    expect(columns[2].header).toBe('Matched Member');
  });

  it('matches members correctly in table', () => {
    render(<AliasesTab {...defaultProps} aliases={sampleAliases} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const matchedMemberColumn = mockTableCall.columns[2];
    
    // Test member match for first alias
    const firstMatch = matchedMemberColumn.accessorFn(sampleAliases[0]);
    expect(firstMatch).toBe('John Doe (john@example.com)');
    
    // Test member match for second alias
    const secondMatch = matchedMemberColumn.accessorFn(sampleAliases[1]);
    expect(secondMatch).toBe('Jane Smith (jane@example.com)');
  });

  it('handles unmatched members in table', () => {
    const unmatchedAlias = {
      vanId: '999999',
      alias: 'Unknown'
    };
    
    render(<AliasesTab {...defaultProps} aliases={[unmatchedAlias]} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const matchedMemberColumn = mockTableCall.columns[2];
    
    const match = matchedMemberColumn.accessorFn(unmatchedAlias);
    expect(match).toBe('Member not found');
  });

  it('handles members with missing data', () => {
    const memberWithMissingData = {
      vanId: '123456',
      name: '',
      preferredEmail: ''
    };
    
    render(<AliasesTab 
      {...defaultProps} 
      memberData={[memberWithMissingData]}
      aliases={[{ vanId: '123456', alias: 'Test' }]}
    />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const matchedMemberColumn = mockTableCall.columns[2];
    
    const match = matchedMemberColumn.accessorFn({ vanId: '123456', alias: 'Test' });
    expect(match).toBe('[No name] (No email)');
  });

  it('passes correct data to MaterialReactTable', () => {
    render(<AliasesTab {...defaultProps} aliases={sampleAliases} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    
    expect(mockTableCall.data).toEqual(sampleAliases);
  });

  it('passes correct props to AliasModal', () => {
    render(<AliasesTab {...defaultProps} />);
    
    expect(AliasModal).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: false,
        onCreateAlias: mockOnCreateAlias,
        memberData: sampleMemberData,
        prefilledAlias: ''
      }),
      expect.any(Object)
    );
  });
});
