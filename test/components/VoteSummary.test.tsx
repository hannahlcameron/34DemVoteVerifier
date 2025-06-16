import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoteSummary } from '../../app/components/VoteSummary';
import styles from '../../app/styles/VoteSummary.module.css';

describe('VoteSummary', () => {
  const defaultProps = {
    name: 'Test Poll',
    choiceToVotes: new Map([
      ['Yes', 75],
      ['No', 25]
    ]),
    totalVotes: 105,
    validVotes: 100,
    invalidVotes: 3,
    duplicateVotes: 2
  };

  it('renders poll name', () => {
    render(<VoteSummary {...defaultProps} />);
    expect(screen.getByText('Poll: Test Poll')).toBeInTheDocument();
  });

  it('renders question when provided', () => {
    const props = {
      ...defaultProps,
      question: 'Should we approve this?'
    };
    render(<VoteSummary {...props} />);
    
    expect(screen.getByText('Question:')).toBeInTheDocument();
    expect(screen.getByText('Should we approve this?')).toBeInTheDocument();
  });

  it('does not render question section when question is not provided', () => {
    render(<VoteSummary {...defaultProps} />);
    expect(screen.queryByText('Question:')).not.toBeInTheDocument();
  });

  it('displays vote statistics correctly', () => {
    render(<VoteSummary {...defaultProps} />);
    
    const statsText = screen.getByText(/There were/);
    expect(statsText).toHaveTextContent('105');  // total votes
    expect(statsText).toHaveTextContent('100');  // valid votes
    expect(statsText).toHaveTextContent('3');    // invalid votes
    expect(statsText).toHaveTextContent('2');    // duplicate votes
  });

  it('renders vote chart with correct percentages', () => {
    const { container } = render(<VoteSummary {...defaultProps} />);
    
    // Yes votes: 75/100 = 75%
    const bars = container.getElementsByClassName(styles.bar);
    expect(bars[0]).toHaveTextContent('75 votes (75%)');
    
    // No votes: 25/100 = 25%
    expect(bars[1]).toHaveTextContent('25 votes (25%)');
    
    // Check the inline style directly
    expect((bars[0] as HTMLElement).style.width).toBe('75%');
    expect((bars[1] as HTMLElement).style.width).toBe('25%');
  });

  it('enforces minimum bar width of 15%', () => {
    const props = {
      ...defaultProps,
      choiceToVotes: new Map([
        ['Yes', 98],
        ['No', 2]
      ])
    };
    
    // No votes: 2/100 = 2%, but should be displayed as 15%
    const { container } = render(<VoteSummary {...props} />);
    const bars = container.getElementsByClassName(styles.bar);
    const voteText = screen.getAllByText(/votes/);
    expect(voteText[1]).toHaveTextContent('2 votes (2%)');
    expect((bars[1] as HTMLElement).style.width).toBe('15%');
  });

  it('handles zero valid votes', () => {
    const props = {
      ...defaultProps,
      choiceToVotes: new Map([
        ['Yes', 0],
        ['No', 0]
      ]),
      validVotes: 0,
      totalVotes: 3,
      invalidVotes: 2,
      duplicateVotes: 1
    };
    
    // Should still render bars with minimum width
    const { container } = render(<VoteSummary {...props} />);
    const bars = container.getElementsByClassName(styles.bar);
    expect((bars[0] as HTMLElement).style.width).toBe('15%');
    expect((bars[1] as HTMLElement).style.width).toBe('15%');
  });

  it('displays all vote choices', () => {
    const props = {
      ...defaultProps,
      choiceToVotes: new Map([
        ['Strongly Agree', 50],
        ['Agree', 30],
        ['Disagree', 15],
        ['Strongly Disagree', 5]
      ])
    };
    render(<VoteSummary {...props} />);
    
    expect(screen.getByText('Strongly Agree')).toBeInTheDocument();
    expect(screen.getByText('Agree')).toBeInTheDocument();
    expect(screen.getByText('Disagree')).toBeInTheDocument();
    expect(screen.getByText('Strongly Disagree')).toBeInTheDocument();
  });

  it('calculates percentages correctly for each choice', () => {
    const props = {
      ...defaultProps,
      choiceToVotes: new Map([
        ['Option A', 40],
        ['Option B', 30],
        ['Option C', 20],
        ['Option D', 10]
      ])
    };
    render(<VoteSummary {...props} />);
    
    expect(screen.getByText(/40 votes \(40%\)/)).toBeInTheDocument();
    expect(screen.getByText(/30 votes \(30%\)/)).toBeInTheDocument();
    expect(screen.getByText(/20 votes \(20%\)/)).toBeInTheDocument();
    expect(screen.getByText(/10 votes \(10%\)/)).toBeInTheDocument();
  });

  it('maintains bar order according to Map iteration order', () => {
    const props = {
      ...defaultProps,
      choiceToVotes: new Map([
        ['First', 30],
        ['Second', 40],
        ['Third', 30]
      ])
    };
    render(<VoteSummary {...props} />);
    
    const bars = screen.getAllByText(/votes/);
    expect(bars[0]).toHaveTextContent('30 votes (30%)'); // First
    expect(bars[1]).toHaveTextContent('40 votes (40%)'); // Second
    expect(bars[2]).toHaveTextContent('30 votes (30%)'); // Third
  });
});
