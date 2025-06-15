import React from 'react';
import styles from '../styles/VoteSummary.module.css';
import { type Vote } from '../vote-verification';

interface VoteSummaryProps {
  name: string;
  question?: string;
  choiceToVotes: Map<string, number>;
  totalVotes: number;
  validVotes: number;
  invalidVotes: number;
  duplicateVotes: number;
}

export const VoteSummary: React.FC<VoteSummaryProps> = ({
  name,
  question,
  choiceToVotes,
  totalVotes,
  validVotes,
  invalidVotes,
  duplicateVotes
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Poll: {name}</h2>
      
      {question && (
        <div className={styles.questionBox}>
          <h3 className={styles.questionTitle}>Question:</h3>
          <p className={styles.questionText}>{question}</p>
        </div>
      )}

      <div className={styles.voteSummary}>
        <h3 className={styles.summaryTitle}>Vote Summary</h3>
        <div className={styles.chartContainer}>
          {Array.from(choiceToVotes.entries()).map(([vote, count]) => {
            const percentage = Math.floor((count / validVotes) * 100);
            return (
              <div key={vote} className={styles.chartRow}>
                <div className={styles.choiceLabel}>{vote}</div>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.bar}
                    style={{ width: `${Math.max(percentage, 15)}%` }}
                  >
                    {count} votes ({percentage}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.statsContainer}>
        <p className={styles.stats}>
          There were <b>{totalVotes}</b> total votes,{" "}
          <b>{validVotes}</b> valid votes,{" "}
          <b>{invalidVotes}</b> invalid votes, and{" "}
          <b>{duplicateVotes}</b> duplicates
        </p>
      </div>
    </div>
  );
};
