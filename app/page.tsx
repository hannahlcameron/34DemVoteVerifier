"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { MaterialReactTable } from "material-react-table";
import Modal from "react-modal";

Amplify.configure(outputs);

const client = generateClient<Schema>();

type Vote = {
    username: string,
    email: string,
    time:string,
    choice: string
};

type CategorizedVotes = {
    validVotes: Vote[];
    invalidVotes: Vote[];
    duplicateVotes: Vote[];
}

type PollResult = {
    name: string;
    votes: Vote[];
    categorizedVotes : CategorizedVotes;
    choiceToVotes: Map<string, number>;
};

type Member = {
    vanId: string;
    name: string;
    preferredEmail: string;
}

type Alias = {
    vanId: string;
    alias: string;
};

type TabType = "members" | "polls" | "aliases";

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [memberData, setMemberData] = useState<Member[]>([]);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [aliasInput, setAliasInput] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [modalMemberSearch, setModalMemberSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledAlias, setPrefilledAlias] = useState<string>("");

  // Function to open the modal with the pre-filled alias
  function openAliasModal(username: string) {
      setPrefilledAlias(username);
      setIsModalOpen(true);
  }

  // Function to close the modal
  function closeAliasModal() {
      setIsModalOpen(false);
      setPrefilledAlias("");
  }

  // Function to create alias from modal
  function createAliasFromModal() {
      if (selectedMember && prefilledAlias) {
          const newAlias: Alias = { vanId: selectedMember.vanId, alias: prefilledAlias };
          const updatedAliases = [...aliases, newAlias];

          setAliases(updatedAliases);
          setAliasInput("");
          setSelectedMember(null);

          // Re-categorize votes
          const updatedPollResults = pollResults.map(poll => {
              const categorizedVotes = categorizeVotes(poll.votes, memberData, updatedAliases);
              return { ...poll, categorizedVotes, choiceToVotes: summarizeVotes(categorizedVotes.validVotes) };
          });

          setPollResults(updatedPollResults);
          closeAliasModal();
      }
  }

  function listTodos() {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }

  useEffect(() => {
    listTodos();
  }, []);

  function parseTSV(tsv: string): Member[] | { error: string } {
      const lines = tsv.trim().split("\n");
      if (lines.length < 2) {
          return { error: "File must contain at least a header line and one data line" };
      }

      // Skip header line and process remaining lines
      for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const values = line.split("\t");
          
          if (values.length < 1) {
              return {
                  error: `Invalid format on line ${i + 1}:\n` +
                        `"${line}"\n\n` +
                        `Expected at least VANID, with optional Name and Email.\n` +
                        `Example of correct format:\n` +
                        `123456789\tBig Bird\tbird@sesamestreet.org`
              };
          }
      }

      // If validation passed, process the data
      const data = lines.slice(1).map(line => {
          const values = line.split("\t");
          return {
              vanId: values[0].trim(),
              name: values[1] ? values[1].trim() : "",
              preferredEmail: values[2] ? values[2].trim() : ""
          } as Member;
      });
      return data;
  }

  function summarizeVotes(votes : Vote[]) {
      const summary = new Map<string, number>();

      votes.forEach(vote => {
          const existing = summary.get(vote.choice) || 0;
          summary.set(vote.choice, existing + 1);
      });

      return summary;
  }

  function categorizeVotes(votes: Vote[], members: Member[], aliases: Alias[]): CategorizedVotes {
      const aliasMap = new Map(aliases.map(alias => [alias.alias.toLowerCase().trim(), alias.vanId]));
      const emailMap = new Map(members
          .filter(member => member.preferredEmail)
          .map(member => [member.preferredEmail.toLowerCase().trim(), member.vanId]));
      const usernameMap = new Map(members
          .filter(member => member.name)
          .map(member => {
              const nameParts = member.name.toLowerCase().trim().split(/\s+/);
              if (nameParts.length === 1) {
                  return [nameParts[0], member.vanId];
              }
              const firstName = nameParts[0];
              const lastName = nameParts[nameParts.length - 1];
              return [`${firstName} ${lastName}`, member.vanId];
          }));

      const votedVanIds = new Set<string>();

      const validVotes: Vote[] = [];
      const invalidVotes: Vote[] = [];
      const duplicateVotes: Vote[] = [];

      votes.forEach(vote => {
          const usernameParts = vote.username.toLowerCase().trim().split(/\s+/);
          const lowerUsername = usernameParts.length === 1 ? 
              usernameParts[0] : 
              `${usernameParts[0]} ${usernameParts[usernameParts.length - 1]}`;
          const lowerEmail = vote.email.toLowerCase().trim();

          const vanId = aliasMap.get(lowerUsername)
              || aliasMap.get(lowerEmail)
              || (lowerEmail && emailMap.get(lowerEmail))
              || (lowerUsername && usernameMap.get(lowerUsername));

          if (vanId === undefined) {
              invalidVotes.push(vote);
          } else if (votedVanIds.has(vanId)) {
              duplicateVotes.push(vote);
          } else {
              validVotes.push(vote);
              votedVanIds.add(vanId);
          }
      });

      return {validVotes, invalidVotes, duplicateVotes};
  }

  function findVoteBlock(lines: string[]): { title: string, headerIndex: number } | null {
      let pollTitle = "";
      let headerIndex = -1;

      for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === "Overview" || line === "Launched Polls" || line.startsWith("#,Poll Name")) {
              continue;
          }

          if (line.startsWith("#,User Name,Email Address,Submitted Date and Time,")) {
              headerIndex = i;
              for (let j = i - 1; j >= 0; j--) {
                  const titleLine = lines[j].trim();
                  if (titleLine && !titleLine.startsWith("#") && 
                      titleLine !== "Overview" && titleLine !== "Launched Polls") {
                      pollTitle = titleLine.split(",")[0].trim();
                      break;
                  }
              }
              if (pollTitle) {
                  break;
              }
          }
      }

      if (!pollTitle || headerIndex === -1) {
          return null;
      }

      return {
          title: pollTitle,
          headerIndex: headerIndex
      };
  }

  function parseCSV(csv: string): PollResult[] | { error: string } {
      if (!csv.trim()) {
          return { error: "The input file is empty" };
      }

      const blocks = csv.split(/\r?\n\r?\n/);
      const results = [];

      for (const block of blocks) {
          const lines = block.split(/\r?\n/);
          const voteBlock = findVoteBlock(lines);
          
          if (!voteBlock) continue;

          const { title: pollName, headerIndex } = voteBlock;
          const voteLines = lines.slice(headerIndex + 1);
          
          if (voteLines.length === 0) {
              return { error: `No votes found in poll "${pollName}"` };
          }

          const votes = voteLines
              .filter(line => line.trim() !== "")
              .map((line, idx) => {
                  if (idx === 0) {
                      return null;
                  }

                  const fields: string[] = [];
                  let field = '';
                  let inQuotes = false;
                  let allContent = [line];
                  let currentLineIdx = idx;
                  let currentLine = line;
                  let startLine = headerIndex + idx + 2;
                  
                  while (true) {
                      for (let i = 0; i < currentLine.length; i++) {
                          const char = currentLine[i];
                          if (char === '"') {
                              if (inQuotes) {
                                  if (i + 1 < currentLine.length && currentLine[i + 1] === '"') {
                                      field += '"';
                                      i++;
                                  } else {
                                      inQuotes = false;
                                      while (i + 1 < currentLine.length && currentLine[i + 1] !== ',') {
                                          i++;
                                      }
                                  }
                              } else {
                                  inQuotes = true;
                              }
                          } else if (char === ',' && !inQuotes) {
                              fields.push(field.trim());
                              field = '';
                          } else {
                              field += char;
                          }
                      }
                      
                      if (inQuotes && currentLineIdx + 1 < voteLines.length) {
                          currentLineIdx++;
                          currentLine = voteLines[currentLineIdx];
                          allContent.push(currentLine);
                          field += '\n';
                      } else {
                          fields.push(field.trim());
                          break;
                      }
                  }
                  
                  const fullContent = allContent.join('\n');
                  const lineRange = allContent.length > 1 ? 
                      `Lines ${startLine}-${startLine + allContent.length - 1}` : 
                      `Line ${startLine}`;
                  
                  if (fields.length < 5) {
                      return { error: `${lineRange} has invalid format:\n` +
                                    `"${fullContent}"\n\n` +
                                    `Expected 5 fields (number, name, email, time, vote) but got ${fields.length} fields.` };
                  }

                  const cleanFields = fields.map(f => {
                      let cleaned = f.trim();
                      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                          cleaned = cleaned.slice(1, -1);
                      }
                      return cleaned.replace(/""/g, '"');
                  });

                  const [voteNum, username, email, time, vote] = cleanFields;
                  
                  const parsedVoteNum = parseInt(voteNum);
                  if (isNaN(parsedVoteNum)) {
                      return { error: `${lineRange} has invalid vote number:\n` +
                                    `"${fullContent}"\n\n` +
                                    `Vote number "${voteNum}" is not a valid number` };
                  }

                  if (!username || !email || !time || !vote) {
                      const missing = [];
                      if (!username) missing.push("name");
                      if (!email) missing.push("email");
                      if (!time) missing.push("time");
                      if (!vote) missing.push("choice");
                      return { error: `Vote ${voteNum} (${lineRange}) is missing required data:\n` +
                                    `"${fullContent}"\n\n` +
                                    `Missing fields: ${missing.join(", ")}` };
                  }

                  return { 
                      username: username.trim(), 
                      email: email.trim(), 
                      time: time.trim(), 
                      choice: vote.trim() 
                  } as Vote;
              });

          const nonNullVotes = votes.filter((v): v is (Vote | { error: string }) => v !== null);
          const error = nonNullVotes.find(v => 'error' in v);
          if (error) {
              return error;
          }

          const validVotes = nonNullVotes.filter((v): v is Vote => !('error' in v));
          if (validVotes.length === 0) {
              return { error: `No valid votes found in poll "${pollName}". Please check the data format.` };
          }

          const categorizedVotes = categorizeVotes(validVotes, memberData, []);
          const summary = summarizeVotes(categorizedVotes.validVotes);

          const pollResult: PollResult = {
              name: pollName,
              votes: validVotes,
              categorizedVotes: categorizedVotes,
              choiceToVotes: summary
          };

          results.push(pollResult);
      }

      if (results.length === 0) {
          return { error: "No poll data found in the file. The file should contain poll results with a header row starting with '#'" };
      }

      return results;
  }

  function handleMembersUpload(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const tsv = e.target?.result as string;
              const result = parseTSV(tsv);
              
              if ('error' in result) {
                  alert(result.error);
                  return;
              }
              
              setMemberData(result);
              
              if (pollResults.length > 0) {
                  const updatedPollResults = pollResults.map(poll => {
                      const categorizedVotes = categorizeVotes(poll.votes, result, aliases);
                      return {
                          ...poll,
                          categorizedVotes,
                          choiceToVotes: summarizeVotes(categorizedVotes.validVotes)
                      };
                  });
                  setPollResults(updatedPollResults);
              }

              // Auto-navigate to polls tab after successful upload
              setActiveTab("polls");
          };
          reader.readAsText(file);
      }
  }

  function handleZoomUpload(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const csv = e.target?.result as string;
              const result = parseCSV(csv);
              
              if ('error' in result) {
                  alert(result.error);
                  return;
              }
              
              setPollResults(result);
          };
          reader.readAsText(file);
      }
  }

  function handleAliasInputChange(event: React.ChangeEvent<HTMLInputElement>) {
      setAliasInput(event.target.value);
  }

  function handleMemberSelect(event: React.ChangeEvent<HTMLSelectElement>) {
      const selectedVanId = event.target.value;
      const member = memberData.find(member => member.vanId === selectedVanId);
      setSelectedMember(member || null);
  }

  function createAlias() {
      if (selectedMember && aliasInput) {
          const newAlias: Alias = { vanId: selectedMember.vanId, alias: aliasInput };
          const updatedAliases = [...aliases, newAlias];

          setAliases([...aliases, newAlias]);
          setAliasInput("");
          setSelectedMember(null);

          const updatedPollResults = pollResults.map(poll => {
              const categorizedVotes = categorizeVotes(poll.votes, memberData, updatedAliases);
              return { ...poll, categorizedVotes, choiceToVotes: summarizeVotes(categorizedVotes.validVotes) };
          });

          setPollResults(updatedPollResults);
      }
  }

  function resetAllData() {
    setMemberData([]);
    setPollResults([]);
    setAliases([]);
    setSelectedMember(null);
    setAliasInput("");
    setActiveTab("members");
  }

  return (
    <main>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header with Democratic Party Theme */}
        <div style={{
          backgroundColor: '#0015BC',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          height: '60px'
        }}>
          <span style={{ fontSize: '24px' }}>🗽</span>
          <h1 style={{ margin: 0, fontSize: '20px' }}>Democratic Party Vote Verification</h1>
        </div>
        {/* Fixed Position Tabs and Reset Button Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '2px solid #0015BC',
          paddingBottom: '10px',
          backgroundColor: 'white',
          position: 'sticky',
          top: '0',
          zIndex: 100,
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab("members")}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === "members" ? '#0015BC' : '#f8f9fa',
                color: activeTab === "members" ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '16px' }}>🐴</span>
                1 - Members
              </span>
              <span style={{
                backgroundColor: activeTab === "members" ? '#fff' : '#0015BC',
                color: activeTab === "members" ? '#0015BC' : '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.8em'
              }}>
                {memberData.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("polls")}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === "polls" ? '#0015BC' : '#f8f9fa',
                color: activeTab === "polls" ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '16px' }}>📹</span>
                2 - Zoom Poll
              </span>
              <span style={{
                backgroundColor: activeTab === "polls" ? '#fff' : '#0015BC',
                color: activeTab === "polls" ? '#0015BC' : '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.8em'
              }}>
                {pollResults.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("aliases")}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === "aliases" ? '#0015BC' : '#f8f9fa',
                color: activeTab === "aliases" ? 'white' : '#333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '16px' }}>🔄</span>
                3 - Aliases
              </span>
              <span style={{
                backgroundColor: activeTab === "aliases" ? '#fff' : '#0015BC',
                color: activeTab === "aliases" ? '#0015BC' : '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.8em'
              }}>
                {aliases.length}
              </span>
            </button>
          </div>

          <button 
            onClick={resetAllData}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            disabled={memberData.length === 0}
          >
            Reset All Data
          </button>
        </div>

        {/* Members Tab Content */}
        {activeTab === "members" && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="file" 
                accept=".txt" 
                onChange={handleMembersUpload}
                style={{ 
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff'
                }}
              />
            </div>
            {memberData.length > 0 && (
              <MaterialReactTable
                columns={["vanId", "name", "preferredEmail"].map(header => ({
                  header,
                  accessorKey: header
                }))}
                data={memberData}
              />
            )}
          </div>
        )}

        {/* Polls Tab Content */}
        {activeTab === "polls" && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleZoomUpload}
                disabled={!memberData.length}
                style={{ 
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: memberData.length ? '#fff' : '#f8f9fa'
                }}
              />
            </div>
            {pollResults.map((poll, index) => (
              <div key={index} style={{ marginBottom: '30px' }}>
                <h2>Poll: {poll.name}</h2>
                <div style={{ marginBottom: '20px' }}>
                  <h3>Vote Summary</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Choice</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Count</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>% of Valid Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(poll.choiceToVotes.entries()).map(([vote, count]) => (
                        <tr key={vote}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{vote}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{count}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                            {Math.floor((count / poll.categorizedVotes.validVotes.length) * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <p>
                    There were <b>{poll.votes.length}</b> total votes,{" "}
                    <b>{poll.categorizedVotes.validVotes.length}</b> valid votes,{" "}
                    <b>{poll.categorizedVotes.invalidVotes.length}</b> invalid votes, and{" "}
                    <b>{poll.categorizedVotes.duplicateVotes.length}</b> duplicates
                  </p>
                  <h3>Invalid Votes</h3>
                  <MaterialReactTable
                    columns={[
                      { header: "Username", accessorKey: "username" },
                      { header: "Email", accessorKey: "email" },
                      { header: "Time", accessorKey: "time" },
                      { header: "Choice", accessorKey: "choice" },
                      {
                        header: "Actions",
                        accessorKey: "actions",
                        Cell: ({ row }) => (
                          <button 
                            onClick={() => openAliasModal(row.original.username)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#0015BC',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Create Alias
                          </button>
                        )
                      }
                    ]}
                    data={poll.categorizedVotes.invalidVotes}
                  />

                  <h3>Duplicate Votes</h3>
                  {poll.categorizedVotes.duplicateVotes.length > 0 ? (
                    <MaterialReactTable
                      columns={["username", "email", "time", "choice"].map(header => ({
                        header,
                        accessorKey: header
                      }))}
                      data={poll.categorizedVotes.duplicateVotes}
                    />
                  ) : (
                    <p>None!</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Aliases Tab Content */}
        {activeTab === "aliases" && (
          <div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '15px', 
              maxWidth: '500px',
              marginBottom: '30px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Alias Name:</label>
                <input
                  type="text"
                  value={aliasInput}
                  onChange={handleAliasInputChange}
                  placeholder="Enter alias"
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Select Member</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members..."
                    style={{ 
                      width: '100%',
                      padding: '8px 32px 8px 8px',
                      borderRadius: '4px',
                      border: '1px solid #ccc'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    fontSize: '16px'
                  }}>
                    🔍
                  </span>
                </div>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  marginTop: '5px',
                  backgroundColor: 'white'
                }}>
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
                      <div
                        key={member.vanId}
                        onClick={() => setSelectedMember(member)}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          backgroundColor: selectedMember?.vanId === member.vanId ? '#e6f3ff' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 
                            selectedMember?.vanId === member.vanId ? '#e6f3ff' : 'transparent';
                        }}
                      >
                        {member.vanId} - {member.name || '[No name]'} {member.preferredEmail ? `(${member.preferredEmail})` : ''}
                      </div>
                    ))
                  }
                </div>
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginTop: '15px',
                justifyContent: 'flex-end' 
              }}>
                <button 
                  onClick={createAlias} 
                  disabled={!aliasInput || !selectedMember}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: !aliasInput || !selectedMember ? '#ccc' : '#0015BC',
                    color: 'white',
                    cursor: !aliasInput || !selectedMember ? 'not-allowed' : 'pointer'
                  }}
                >
                  Add Alias
                </button>
              </div>
            </div>

            {aliases.length > 0 ? (
              <MaterialReactTable
                columns={["vanId", "alias"].map(header => ({
                  header,
                  accessorKey: header
                }))}
                data={aliases}
              />
            ) : (
              <p>No aliases!</p>
            )}
          </div>
        )}

        <Modal 
          isOpen={isModalOpen} 
          onRequestClose={closeAliasModal}
          style={{
            content: {
              top: '50%',
              left: '50%',
              right: 'auto',
              bottom: 'auto',
              marginRight: '-50%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              padding: '20px',
              borderRadius: '8px',
              zIndex: 1000
            },
            overlay: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999
            }
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Create Alias</h2>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Alias Name:</label>
              <input
                type="text"
                value={prefilledAlias}
                onChange={(e) => setPrefilledAlias(e.target.value)}
                placeholder="Enter alias"
                style={{ 
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Select Member</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={modalMemberSearch}
                  onChange={(e) => setModalMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  style={{ 
                    width: '100%',
                    padding: '8px 32px 8px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px'
                }}>
                  🔍
                </span>
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                marginTop: '5px',
                backgroundColor: 'white'
              }}>
                {memberData
                  .filter(member => {
                    const searchTerm = modalMemberSearch.toLowerCase();
                    return (
                      member.vanId.toLowerCase().includes(searchTerm) ||
                      (member.name && member.name.toLowerCase().includes(searchTerm)) ||
                      (member.preferredEmail && member.preferredEmail.toLowerCase().includes(searchTerm))
                    );
                  })
                  .map(member => (
                    <div
                      key={member.vanId}
                      onClick={() => setSelectedMember(member)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedMember?.vanId === member.vanId ? '#e6f3ff' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 
                          selectedMember?.vanId === member.vanId ? '#e6f3ff' : 'transparent';
                      }}
                    >
                      {member.vanId} - {member.name || '[No name]'} {member.preferredEmail ? `(${member.preferredEmail})` : ''}
                    </div>
                  ))
                }
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginTop: '15px',
              justifyContent: 'flex-end' 
            }}>
              <button 
                onClick={closeAliasModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  color: '#333'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={createAliasFromModal} 
                disabled={!prefilledAlias || !selectedMember}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: !prefilledAlias || !selectedMember ? '#ccc' : '#0015BC',
                  color: 'white',
                  cursor: !prefilledAlias || !selectedMember ? 'not-allowed' : 'pointer'
                }}
              >
                Add Alias
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
