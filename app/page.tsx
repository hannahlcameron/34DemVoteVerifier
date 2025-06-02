"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./globals.css";
import { MaterialReactTable } from "material-react-table";
import Modal from "react-modal";
import Cookies from 'js-cookie';

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
    question: string;
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
  const [expandedVotes, setExpandedVotes] = useState<{[key: string]: {invalid: boolean, duplicate: boolean}}>({});

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

  // Load aliases from cookies on initial load
  useEffect(() => {
    const savedAliases = Cookies.get('aliases');
    if (savedAliases) {
      try {
        const parsedAliases = JSON.parse(savedAliases);
        setAliases(parsedAliases);
      } catch (e) {
        console.error('Error parsing aliases from cookies:', e);
      }
    }
    listTodos();
  }, []);

  // Save aliases to cookies whenever they change
  useEffect(() => {
    Cookies.set('aliases', JSON.stringify(aliases), { expires: 365 }); // Expires in 1 year
  }, [aliases]);

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

  function findVoteBlock(lines: string[]): { title: string, headerIndex: number, question: string } | null {
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

      // Extract the question from the header line
      const headerLine = lines[headerIndex];
      const lastCommaIndex = headerLine.lastIndexOf(',');
      const question = lastCommaIndex !== -1 ? 
          headerLine.slice(lastCommaIndex + 1).trim().replace(/^"|"$/g, '').trim() : 
          '';

      return {
          title: pollTitle,
          headerIndex: headerIndex,
          question: question
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

          const { title: pollName, headerIndex, question } = voteBlock;
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
              question: question,
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
    Cookies.remove('aliases'); // Clear aliases cookie
  }

  function resetAliases() {
    setAliases([]);
    Cookies.remove('aliases');
    // Re-categorize votes with empty aliases
    const updatedPollResults = pollResults.map(poll => {
      const categorizedVotes = categorizeVotes(poll.votes, memberData, []);
      return { ...poll, categorizedVotes, choiceToVotes: summarizeVotes(categorizedVotes.validVotes) };
    });
    setPollResults(updatedPollResults);
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Fixed Position Tabs and Reset Button Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '2px solid var(--primary-blue)',
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
            className="button"
            style={{
              backgroundColor: activeTab === "members" ? 'var(--primary-blue)' : '#f8f9fa',
              color: activeTab === "members" ? 'white' : '#333',
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
              backgroundColor: activeTab === "members" ? '#fff' : 'var(--primary-blue)',
              color: activeTab === "members" ? 'var(--primary-blue)' : '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8em'
            }}>
              {memberData.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("polls")}
            className="button"
            style={{
              backgroundColor: activeTab === "polls" ? 'var(--primary-blue)' : '#f8f9fa',
              color: activeTab === "polls" ? 'white' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '16px' }}>📹</span>
              2 - Zoom Polls
            </span>
            <span style={{
              backgroundColor: activeTab === "polls" ? '#fff' : 'var(--primary-blue)',
              color: activeTab === "polls" ? 'var(--primary-blue)' : '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8em'
            }}>
              {pollResults.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("aliases")}
            className="button"
            style={{
              backgroundColor: activeTab === "aliases" ? 'var(--primary-blue)' : '#f8f9fa',
              color: activeTab === "aliases" ? 'white' : '#333',
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
              backgroundColor: activeTab === "aliases" ? '#fff' : 'var(--primary-blue)',
              color: activeTab === "aliases" ? 'var(--primary-blue)' : '#fff',
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
          className="button"
          style={{
            backgroundColor: 'var(--button-orange)',
            color: 'white'
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
              columns={[
                { header: "Voter ID", accessorKey: "vanId" },
                { header: "Name", accessorKey: "name" },
                { header: "Email", accessorKey: "preferredEmail" }
              ]}
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
              {poll.question && (
                <div style={{ 
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Question:</h3>
                  <p style={{ margin: 0 }}>{poll.question}</p>
                </div>
              )}
              <div style={{ marginBottom: '30px' }}>
                <h3>Vote Summary</h3>
                <div style={{ marginTop: '15px' }}>
                  {Array.from(poll.choiceToVotes.entries()).map(([vote, count]) => {
                    const percentage = Math.floor((count / poll.categorizedVotes.validVotes.length) * 100);
                    return (
                      <div key={vote} style={{ marginBottom: '12px' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <div style={{ fontWeight: 'bold' }}>{vote}</div>
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '30px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.max(percentage, 15)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary-blue) 0%, #0094c2 100%)',
                            transition: 'width 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '10px',
                            paddingRight: '10px',
                            color: 'white',
                            fontWeight: 'bold',
                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.1)',
                            whiteSpace: 'nowrap'
                          }}>
                            {count} votes ({percentage}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p>
                  There were <b>{poll.votes.length}</b> total votes,{" "}
                  <b>{poll.categorizedVotes.validVotes.length}</b> valid votes,{" "}
                  <b>{poll.categorizedVotes.invalidVotes.length}</b> invalid votes, and{" "}
                  <b>{poll.categorizedVotes.duplicateVotes.length}</b> duplicates
                </p>
                {poll.categorizedVotes.invalidVotes.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => setExpandedVotes(prev => ({
                        ...prev,
                        [poll.name]: {
                          ...prev[poll.name] || {},
                          invalid: !(prev[poll.name]?.invalid ?? false)
                        }
                      }))}
                      className="button"
                      style={{
                        backgroundColor: expandedVotes[poll.name]?.invalid ? 'var(--primary-blue)' : '#f8f9fa',
                        color: expandedVotes[poll.name]?.invalid ? 'white' : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid var(--primary-blue)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Invalid Votes</span>
                      <span style={{
                        backgroundColor: expandedVotes[poll.name]?.invalid ? '#fff' : 'var(--primary-blue)',
                        color: expandedVotes[poll.name]?.invalid ? 'var(--primary-blue)' : '#fff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.9em',
                        minWidth: '24px',
                        textAlign: 'center'
                      }}>
                        {poll.categorizedVotes.invalidVotes.length}
                      </span>
                      <span style={{ 
                        fontSize: '0.8em',
                        transform: expandedVotes[poll.name]?.invalid ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}>
                        ▼
                      </span>
                    </button>
                  </div>
                )}

                {expandedVotes[poll.name]?.invalid && (
                  <div style={{ marginBottom: '20px' }}>
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
                              className="button"
                              style={{
                                backgroundColor: 'var(--primary-blue)',
                                color: 'white',
                                padding: '4px 8px'
                              }}
                            >
                              Create Alias
                            </button>
                          )
                        }
                      ]}
                      data={poll.categorizedVotes.invalidVotes}
                    />
                  </div>
                )}

                {poll.categorizedVotes.duplicateVotes.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <button
                      onClick={() => setExpandedVotes(prev => ({
                        ...prev,
                        [poll.name]: {
                          ...prev[poll.name] || {},
                          duplicate: !(prev[poll.name]?.duplicate ?? false)
                        }
                      }))}
                      className="button"
                      style={{
                        backgroundColor: expandedVotes[poll.name]?.duplicate ? 'var(--primary-blue)' : '#f8f9fa',
                        color: expandedVotes[poll.name]?.duplicate ? 'white' : '#333',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid var(--primary-blue)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>Duplicate Votes</span>
                      <span style={{
                        backgroundColor: expandedVotes[poll.name]?.duplicate ? '#fff' : 'var(--primary-blue)',
                        color: expandedVotes[poll.name]?.duplicate ? 'var(--primary-blue)' : '#fff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.9em',
                        minWidth: '24px',
                        textAlign: 'center'
                      }}>
                        {poll.categorizedVotes.duplicateVotes.length}
                      </span>
                      <span style={{ 
                        fontSize: '0.8em',
                        transform: expandedVotes[poll.name]?.duplicate ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}>
                        ▼
                      </span>
                    </button>
                  </div>
                )}

                {expandedVotes[poll.name]?.duplicate && (
                  <div style={{ marginBottom: '20px' }}>
                    <MaterialReactTable
                      columns={["username", "email", "time", "choice"].map(header => ({
                        header,
                        accessorKey: header
                      }))}
                      data={poll.categorizedVotes.duplicateVotes}
                    />
                  </div>
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
                  ))}
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              marginTop: '15px',
              justifyContent: 'flex-end'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={resetAliases}
                  className="button"
                  style={{
                    backgroundColor: 'var(--button-orange)',
                    color: 'white'
                  }}
                >
                  Reset Aliases
                </button>
                <button 
                  onClick={createAlias} 
                  disabled={!aliasInput || !selectedMember}
                  className="button"
                  style={{
                    backgroundColor: !aliasInput || !selectedMember ? '#ccc' : 'var(--primary-blue)',
                    color: 'white'
                  }}
                >
                  Add Alias
                </button>
              </div>
            </div>
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
                ))}
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
              className="button"
              style={{
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: '1px solid #ccc'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={createAliasFromModal} 
              disabled={!prefilledAlias || !selectedMember}
              className="button"
              style={{
                backgroundColor: !prefilledAlias || !selectedMember ? '#ccc' : 'var(--primary-blue)',
                color: 'white'
              }}
            >
              Add Alias
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
