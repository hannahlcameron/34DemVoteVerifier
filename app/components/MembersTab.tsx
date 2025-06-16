import React from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
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
  const columns = React.useMemo<MRT_ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: 'vanId',
        header: 'Voter ID',
        size: 150,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        size: 200,
      },
      {
        accessorKey: 'preferredEmail',
        header: 'Email',
        size: 250,
      },
    ],
    []
  );

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <input 
          type="file" 
          accept=".txt" 
          onChange={onMembersUpload}
          className={styles.fileInput}
          data-testid="file-input"
        />
      </div>
      
      {memberData.length > 0 && (
        <MaterialReactTable
          columns={columns}
          data={memberData}
          enableColumnFilters
          enableSorting
          enableTopToolbar
          enableBottomToolbar
          muiTableContainerProps={{ sx: { maxHeight: '500px' } }}
        />
      )}
    </div>
  );
};
