import React from 'react';
import styles from '../styles/TabNavigation.module.css';

type TabType = "members" | "polls" | "aliases";

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  memberCount: number;
  pollCount: number;
  aliasCount: number;
  onResetData: () => void;
  hasData: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  memberCount,
  pollCount,
  aliasCount,
  onResetData,
  hasData
}) => (
    <div className={styles.container}>
      <div className={styles.tabGroup}>
        <TabButton
          active={activeTab === "members"}
          onClick={() => setActiveTab("members")}
          icon="🐴"
          label="1 - Members"
          count={memberCount}
        />
        <TabButton
          active={activeTab === "polls"}
          onClick={() => setActiveTab("polls")}
          icon="📹"
          label="2 - Zoom Polls"
          count={pollCount}
        />
        <TabButton
          active={activeTab === "aliases"}
          onClick={() => setActiveTab("aliases")}
          icon="🔄"
          label="3 - Aliases"
          count={aliasCount}
        />
      </div>

      <button 
        onClick={onResetData}
        className={`${styles.resetButton} ${!hasData ? styles.disabled : ''}`}
        disabled={!hasData}
      >
        Reset All Data
      </button>
    </div>
  );

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}

const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  icon,
  label,
  count
}) => (
    <button
      onClick={onClick}
      className={`${styles.tabButton} ${active ? styles.active : ''}`}
    >
      <span className={styles.tabContent}>
        <span className={styles.tabIcon}>{icon}</span>
        {label}
      </span>
      <span className={`${styles.tabCount} ${active ? styles.activeCount : ''}`}>
        {count}
      </span>
    </button>
  );
