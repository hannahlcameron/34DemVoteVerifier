import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation } from '../../app/components/TabNavigation';

describe('TabNavigation', () => {
  const defaultProps = {
    activeTab: 'members' as const,
    setActiveTab: jest.fn(),
    memberCount: 5,
    pollCount: 3,
    aliasCount: 2,
    onResetData: jest.fn(),
    hasData: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tabs with correct labels and counts', () => {
    render(<TabNavigation {...defaultProps} />);
    
    // Check member tab
    const memberTab = screen.getByText('1 - Members');
    expect(memberTab).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    // Check polls tab
    const pollsTab = screen.getByText('2 - Zoom Polls');
    expect(pollsTab).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check aliases tab
    const aliasesTab = screen.getByText('3 - Aliases');
    expect(aliasesTab).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows active state for selected tab', () => {
    const { rerender } = render(<TabNavigation {...defaultProps} />);
    
    // Members tab should be active
    expect(screen.getByText('1 - Members').closest('button')).toHaveClass('active');
    
    // Switch to polls tab
    rerender(<TabNavigation {...defaultProps} activeTab="polls" />);
    expect(screen.getByText('2 - Zoom Polls').closest('button')).toHaveClass('active');
    
    // Switch to aliases tab
    rerender(<TabNavigation {...defaultProps} activeTab="aliases" />);
    expect(screen.getByText('3 - Aliases').closest('button')).toHaveClass('active');
  });

  it('calls setActiveTab when clicking tabs', () => {
    render(<TabNavigation {...defaultProps} />);
    
    // Click polls tab
    fireEvent.click(screen.getByText('2 - Zoom Polls'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('polls');
    
    // Click aliases tab
    fireEvent.click(screen.getByText('3 - Aliases'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('aliases');
    
    // Click members tab
    fireEvent.click(screen.getByText('1 - Members'));
    expect(defaultProps.setActiveTab).toHaveBeenCalledWith('members');
  });

  it('handles reset button functionality', () => {
    const { rerender } = render(<TabNavigation {...defaultProps} />);
    
    // Reset button should be enabled when hasData is true
    const resetButton = screen.getByText('Reset All Data');
    expect(resetButton).toBeEnabled();
    
    // Click reset button
    fireEvent.click(resetButton);
    expect(defaultProps.onResetData).toHaveBeenCalled();
    
    // Reset button should be disabled when hasData is false
    rerender(<TabNavigation {...defaultProps} hasData={false} />);
    expect(resetButton).toBeDisabled();
    expect(resetButton).toHaveClass('disabled');
  });

  it('displays correct counts for each tab', () => {
    const counts = {
      memberCount: 10,
      pollCount: 7,
      aliasCount: 4
    };
    
    render(<TabNavigation {...defaultProps} {...counts} />);
    
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders tab icons', () => {
    render(<TabNavigation {...defaultProps} />);
    
    expect(screen.getByText('🐴')).toBeInTheDocument(); // Members icon
    expect(screen.getByText('📹')).toBeInTheDocument(); // Polls icon
    expect(screen.getByText('🔄')).toBeInTheDocument(); // Aliases icon
  });
});
