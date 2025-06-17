import React from 'react';
import styles from '../styles/VoteSummary.module.css';

interface VoteSummaryProps {
  name: string;
  question?: string;
  choiceToVotes: Map<string, number>;
  totalVotes: number;
  validVotes: number;
  invalidVotes: number;
  duplicateVotes: number;
  onViewVotes: (category: 'total' | 'valid' | 'invalid' | 'duplicate') => void;
}

export const VoteSummary: React.FC<VoteSummaryProps> = ({
  name,
  question,
  choiceToVotes,
  totalVotes,
  validVotes,
  invalidVotes,
  duplicateVotes,
  onViewVotes
}) => (
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
            // Handle the case when validVotes is 0 to avoid NaN
            const percentage = validVotes > 0 ? Math.floor((count / validVotes) * 100) : 0;
            // Always ensure a minimum width of 15% for visibility
            const barWidth = Math.max(percentage, 15);
            
            return (
              <div key={vote} className={styles.chartRow}>
                <div className={styles.choiceLabel}>{vote}</div>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.bar}
                    style={{ width: `${barWidth}%` }}
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
        <div className={styles.stats}>
          <button 
            className={`${styles.statItem} ${styles.clickableStatItem}`}
            onClick={() => onViewVotes('total')}
            type="button"
          >
            <span className={styles.statLabel}>Total Votes</span>
            <span className={`${styles.statValue} ${styles.totalVotes}`}>{totalVotes}</span>
          </button>
          <button 
            className={`${styles.statItem} ${styles.clickableStatItem}`}
            onClick={() => onViewVotes('valid')}
            type="button"
          >
            <span className={styles.statLabel}>Valid Votes</span>
            <span className={`${styles.statValue} ${styles.validVotes}`}>{validVotes}</span>
          </button>
          <button 
            className={`${styles.statItem} ${styles.clickableStatItem}`}
            onClick={() => onViewVotes('invalid')}
            type="button"
          >
            <span className={styles.statLabel}>Invalid Votes</span>
            <span className={`${styles.statValue} ${styles.invalidVotes}`}>{invalidVotes}</span>
          </button>
          <button 
            className={`${styles.statItem} ${styles.clickableStatItem}`}
            onClick={() => onViewVotes('duplicate')}
            type="button"
          >
            <span className={styles.statLabel}>Duplicates</span>
            <span className={`${styles.statValue} ${styles.duplicateVotes}`}>{duplicateVotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
