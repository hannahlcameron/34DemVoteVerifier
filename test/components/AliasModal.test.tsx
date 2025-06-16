import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AliasModal } from '../../app/components/AliasModal';

// Mock react-modal
jest.mock('react-modal', () => jest.fn(({ isOpen, children }) => (
    isOpen ? <div data-testid="modal">{children}</div> : null
  )));

describe('AliasModal', () => {
  const mockOnClose = jest.fn();
  const mockOnCreateAlias = jest.fn();
  
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
    },
    {
      vanId: '345678',
      name: '[No name]',
      preferredEmail: ''
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onCreateAlias: mockOnCreateAlias,
    prefilledAlias: 'Test Alias',
    memberData: sampleMemberData
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<AliasModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Create Alias')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AliasModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('prefills alias input with provided value', () => {
    render(<AliasModal {...defaultProps} />);
    const aliasInput = screen.getByPlaceholderText('Enter alias');
    expect(aliasInput).toHaveValue('Test Alias');
  });

  it('renders member list', () => {
    render(<AliasModal {...defaultProps} />);
    
    expect(screen.getByText('123456 - John Doe (john@example.com)')).toBeInTheDocument();
    expect(screen.getByText('789012 - Jane Smith (jane@example.com)')).toBeInTheDocument();
    expect(screen.getByText('345678 - [No name]')).toBeInTheDocument();
  });

  it('filters members based on search input', () => {
    render(<AliasModal {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    expect(screen.getByText('123456 - John Doe (john@example.com)')).toBeInTheDocument();
    expect(screen.queryByText('789012 - Jane Smith (jane@example.com)')).not.toBeInTheDocument();
  });

  it('handles member selection', () => {
    render(<AliasModal {...defaultProps} />);
    
    const memberItem = screen.getByText('123456 - John Doe (john@example.com)');
    fireEvent.click(memberItem);
    
    expect(memberItem).toHaveClass('selected');
  });

  it('disables create button when no member selected', () => {
    render(<AliasModal {...defaultProps} />);
    
    const createButton = screen.getByText('Add Alias');
    expect(createButton).toBeDisabled();
  });

  it('disables create button when no alias name entered', () => {
    render(<AliasModal {...defaultProps} />);
    
    // Clear alias name
    const aliasInput = screen.getByPlaceholderText('Enter alias');
    fireEvent.change(aliasInput, { target: { value: '' } });
    
    // Select a member
    const memberItem = screen.getByText('123456 - John Doe (john@example.com)');
    fireEvent.click(memberItem);
    
    const createButton = screen.getByText('Add Alias');
    expect(createButton).toBeDisabled();
  });

  it('enables create button when both member and alias name are provided', () => {
    render(<AliasModal {...defaultProps} />);
    
    // Select a member
    const memberItem = screen.getByText('123456 - John Doe (john@example.com)');
    fireEvent.click(memberItem);
    
    const createButton = screen.getByText('Add Alias');
    expect(createButton).toBeEnabled();
  });

  it('calls onCreateAlias with correct data when submitting', () => {
    render(<AliasModal {...defaultProps} />);
    
    // Select a member
    const memberItem = screen.getByText('123456 - John Doe (john@example.com)');
    fireEvent.click(memberItem);
    
    // Submit form
    const createButton = screen.getByText('Add Alias');
    fireEvent.click(createButton);
    
    expect(mockOnCreateAlias).toHaveBeenCalledWith(
      sampleMemberData[0],
      'Test Alias'
    );
  });

  it('resets form and closes modal after successful submission', () => {
    render(<AliasModal {...defaultProps} />);
    
    // Select a member and submit
    const memberItem = screen.getByText('123456 - John Doe (john@example.com)');
    fireEvent.click(memberItem);
    const createButton = screen.getByText('Add Alias');
    fireEvent.click(createButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when clicking cancel button', () => {
    render(<AliasModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles search by email', () => {
    render(<AliasModal {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: 'jane@example' } });
    
    expect(screen.queryByText('123456 - John Doe (john@example.com)')).not.toBeInTheDocument();
    expect(screen.getByText('789012 - Jane Smith (jane@example.com)')).toBeInTheDocument();
  });

  it('handles search by vanId', () => {
    render(<AliasModal {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: '789' } });
    
    expect(screen.queryByText('123456 - John Doe (john@example.com)')).not.toBeInTheDocument();
    expect(screen.getByText('789012 - Jane Smith (jane@example.com)')).toBeInTheDocument();
  });

  it('handles case-insensitive search', () => {
    render(<AliasModal {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search members...');
    fireEvent.change(searchInput, { target: { value: 'JOHN' } });
    
    expect(screen.getByText('123456 - John Doe (john@example.com)')).toBeInTheDocument();
  });

  it('updates alias name on input change', () => {
    render(<AliasModal {...defaultProps} />);
    
    const aliasInput = screen.getByPlaceholderText('Enter alias');
    fireEvent.change(aliasInput, { target: { value: 'New Alias' } });
    
    expect(aliasInput).toHaveValue('New Alias');
  });
});
