import React, { useState } from 'react';
import Modal from 'react-modal';
import styles from '../styles/AliasModal.module.css';
import { type Member } from '../vote-verification';

interface AliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlias: (member: Member, alias: string) => void;
  prefilledAlias: string;
  memberData: Member[];
}

export const AliasModal: React.FC<AliasModalProps> = ({
  isOpen,
  onClose,
  onCreateAlias,
  prefilledAlias,
  memberData
}) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [aliasName, setAliasName] = useState(prefilledAlias);
  const [memberSearch, setMemberSearch] = useState('');

  const handleCreateAlias = () => {
    if (selectedMember && aliasName) {
      onCreateAlias(selectedMember, aliasName);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setSelectedMember(null);
    setAliasName('');
    setMemberSearch('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={resetAndClose}
      className={styles.modal}
      overlayClassName={styles.overlay}
    >
      <div className={styles.container}>
        <h2 className={styles.title}>Create Alias</h2>
        
        <div className={styles.inputGroup}>
          <label htmlFor="aliasNameInput" className={styles.label}>Alias Name:</label>
          <input
            id="aliasNameInput"
            type="text"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
            placeholder="Enter alias"
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="memberSearchInput" className={styles.label}>Select Member</label>
          <div className={styles.searchContainer}>
            <input
              id="memberSearchInput"
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className={styles.input}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          <div className={styles.memberList}>
            {memberData
              .filter(member => {
                const searchTerm = memberSearch.toLowerCase();
                return (
                  member.vanId.toLowerCase().includes(searchTerm) ||
                  (member.name && member.name.toLowerCase().includes(searchTerm)) ||
                  (member.preferredEmail && member.preferredEmail.toLowerCase().includes(searchTerm))
                );
              })
              .map(member => (
                <button
                  key={member.vanId}
                  onClick={() => setSelectedMember(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedMember(member);
                    }
                  }}
                  type="button"
                  className={`${styles.memberItem} ${selectedMember?.vanId === member.vanId ? styles.selected : ''}`}
                >
                  {member.vanId} - {member.name || '[No name]'} {member.preferredEmail ? `(${member.preferredEmail})` : ''}
                </button>
              ))}
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button 
            onClick={resetAndClose}
            className={`${styles.button} ${styles.cancelButton}`}
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateAlias}
            disabled={!aliasName || !selectedMember}
            className={`${styles.button} ${styles.createButton}`}
          >
            Add Alias
          </button>
        </div>
      </div>
    </Modal>
  );
};
