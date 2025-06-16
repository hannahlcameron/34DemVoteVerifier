"use client";

import { useState } from "react";
import styles from "./styles/page.module.css";
import { TabNavigation } from "./components/TabNavigation";
import { MembersTab } from "./components/MembersTab";
import { PollsTab } from "./components/PollsTab";
import { AliasesTab } from "./components/AliasesTab";
import { AliasModal } from "./components/AliasModal";
import { useVoteProcessing } from "./hooks/useVoteProcessing";
import { useAliases } from "./hooks/useAliases";

type TabType = "members" | "polls" | "aliases";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const { 
    memberData, 
    pollResults, 
    handleMembersUpload, 
    handlePollUpload,
    resetData 
  } = useVoteProcessing();

  const {
    aliases,
    isModalOpen,
    prefilledAlias,
    createAlias,
    resetAliases,
    openAliasModal,
    closeAliasModal
  } = useAliases(() => {
    // Re-validate votes when aliases change
    if (pollResults.length > 0) {
      const currentVotes = pollResults[0].votes;
      handlePollUpload(currentVotes).catch(error => {
        console.error('Failed to revalidate votes:', error);
      });
    }
  });

  const handleMembersFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await handleMembersUpload(file);
        setActiveTab("polls"); // Auto-navigate to polls tab after successful upload
      } catch (error) {
        console.error('Failed to upload member data:', error);
        // Use a more user-friendly notification method instead of alert
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload member data';
        // Display error message in UI (could use a toast or error component)
        document.getElementById('error-message')?.setAttribute('data-error', errorMessage);
      }
    }
  };

  const handlePollFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await handlePollUpload(file);
      } catch (error) {
        console.error('Failed to upload poll data:', error);
        // Use a more user-friendly notification method instead of alert
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload poll data';
        // Display error message in UI (could use a toast or error component)
        document.getElementById('error-message')?.setAttribute('data-error', errorMessage);
      }
    }
  };

  const handleResetAll = () => {
    resetData();
    resetAliases();
  };

  return (
    <main className={styles.main}>
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        memberCount={memberData.length}
        pollCount={pollResults.length}
        aliasCount={aliases.length}
        onResetData={handleResetAll}
        hasData={memberData.length > 0}
      />

      <div className={styles.tableWrapper}>
        {activeTab === "members" && (
          <MembersTab
            memberData={memberData}
            onMembersUpload={handleMembersFileUpload}
          />
        )}

        {activeTab === "polls" && (
          <PollsTab
            pollResults={pollResults}
            onPollUpload={handlePollFileUpload}
            hasMemberData={memberData.length > 0}
            onCreateAlias={openAliasModal}
          />
        )}

        {activeTab === "aliases" && (
          <AliasesTab
            aliases={aliases}
            memberData={memberData}
            onCreateAlias={createAlias}
            onResetAliases={resetAliases}
          />
        )}
      </div>

      {/* Modal for creating aliases */}
      <AliasModal
        isOpen={isModalOpen}
        onClose={closeAliasModal}
        onCreateAlias={createAlias}
        prefilledAlias={prefilledAlias}
        memberData={memberData}
      />
    </main>
  );
}
