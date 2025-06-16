import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MembersTab } from '../../app/components/MembersTab';
import { MaterialReactTable } from 'material-react-table';

// Mock MaterialReactTable
jest.mock('material-react-table', () => ({
  MaterialReactTable: jest.fn(() => <div data-testid="mock-table" />)
}));

describe('MembersTab', () => {
  const mockOnMembersUpload = jest.fn();
  const defaultProps = {
    memberData: [],
    onMembersUpload: mockOnMembersUpload
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file upload input', () => {
    render(<MembersTab {...defaultProps} />);
    
    const fileInput = screen.getByTestId('file-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', '.txt');
  });

  it('handles file upload', () => {
    render(<MembersTab {...defaultProps} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockOnMembersUpload).toHaveBeenCalled();
  });

  it('does not render table when no member data', () => {
    render(<MembersTab {...defaultProps} />);
    
    expect(screen.queryByTestId('mock-table')).not.toBeInTheDocument();
  });

  it('renders table when member data exists', () => {
    render(<MembersTab {...defaultProps} memberData={sampleMemberData} />);
    
    expect(screen.getByTestId('mock-table')).toBeInTheDocument();
  });

  it('passes correct props to MaterialReactTable', () => {
    render(<MembersTab {...defaultProps} memberData={sampleMemberData} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    
    // Check data prop
    expect(mockTableCall.data).toEqual(sampleMemberData);
    
    // Check column configuration
    expect(mockTableCall.columns).toHaveLength(3);
    expect(mockTableCall.columns[0].accessorKey).toBe('vanId');
    expect(mockTableCall.columns[1].accessorKey).toBe('name');
    expect(mockTableCall.columns[2].accessorKey).toBe('preferredEmail');
    
    // Check feature flags
    expect(mockTableCall.enableColumnFilters).toBe(true);
    expect(mockTableCall.enableSorting).toBe(true);
    expect(mockTableCall.enableTopToolbar).toBe(true);
    expect(mockTableCall.enableBottomToolbar).toBe(true);
    
    // Check container props
    expect(mockTableCall.muiTableContainerProps.sx).toEqual({ maxHeight: '500px' });
  });

  it('renders with correct column headers', () => {
    render(<MembersTab {...defaultProps} memberData={sampleMemberData} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns[0].header).toBe('Voter ID');
    expect(columns[1].header).toBe('Name');
    expect(columns[2].header).toBe('Email');
  });

  it('applies correct column sizes', () => {
    render(<MembersTab {...defaultProps} memberData={sampleMemberData} />);
    
    const mockTableCall = (MaterialReactTable as jest.Mock).mock.calls[0][0];
    const columns = mockTableCall.columns;
    
    expect(columns[0].size).toBe(150);
    expect(columns[1].size).toBe(200);
    expect(columns[2].size).toBe(250);
  });
});
