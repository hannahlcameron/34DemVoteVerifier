import React, { useState } from 'react';
import { MaterialReactTable } from 'material-react-table';
import styles from '../styles/AliasesTab.module.css';
import { type Member } from '../vote-verification';
import { AliasModal } from './AliasModal';

interface Alias {
  vanId: string;
  alias: string;
}

interface AliasesTabProps {
  aliases: Alias[];
  memberData: Member[];
  onCreateAlias: (member: Member, alias: string) => void;
  onResetAliases: () => void;
}

export const AliasesTab: React.FC<AliasesTabProps> = ({
  aliases,
  memberData,
  onCreateAlias,
  onResetAliases
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledAlias, setPrefilledAlias] = useState('');

  const handleOpenModal = (prefill: string = '') => {
    setPrefilledAlias(prefill);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPrefilledAlias('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          onClick={() => handleOpenModal()}
          className={styles.addButton}
        >
          Add New Alias
        </button>
        <button 
          onClick={onResetAliases}
          className={styles.resetButton}
        >
          Reset Aliases
        </button>
      </div>

      {aliases.length > 0 ? (
        <MaterialReactTable
          columns={[
            { header: "VanID", accessorKey: "vanId" },
            { header: "Alias", accessorKey: "alias" },
            { 
              header: "Matched Member",
              accessorFn: (row) => {
                const member = memberData.find(m => m.vanId === row.vanId);
                return member ? `${member.name || '[No name]'} (${member.preferredEmail || 'No email'})` : 'Member not found';
              }
            }
          ]}
          data={aliases}
        />
      ) : (
        <p className={styles.noAliases}>No aliases created yet!</p>
      )}

      <AliasModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreateAlias={onCreateAlias}
        prefilledAlias={prefilledAlias}
        memberData={memberData}
      />
    </div>
  );
};
