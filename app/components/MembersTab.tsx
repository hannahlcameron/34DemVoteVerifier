import React from 'react';
import { MaterialReactTable } from 'material-react-table';
import styles from '../styles/MembersTab.module.css';
import { type Member } from '../vote-verification';

interface MembersTabProps {
  memberData: Member[];
  onMembersUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  memberData,
  onMembersUpload
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <input 
          type="file" 
          accept=".txt" 
          onChange={onMembersUpload}
          className={styles.fileInput}
        />
      </div>
      
      {memberData.length > 0 && (
        <MaterialReactTable
          columns={[
            { header: "Voter ID", accessorKey: "vanId" },
            { header: "Name", accessorKey: "name" },
            { header: "Email", accessorKey: "preferredEmail" }
          ]}
          data={memberData}
        />
      )}
    </div>
  );
};
