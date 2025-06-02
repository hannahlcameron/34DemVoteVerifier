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

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [memberData, setMemberData] = useState<Member[]>([]);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
    const [aliasInput, setAliasInput] = useState<string>("");
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [aliases, setAliases] = useState<Alias[]>([]);
    const [memberSearch, setMemberSearch] = useState<string>("");
    const [modalMemberSearch, setModalMemberSearch] = useState<string>("");

// Add state variables for modal visibility and pre-filled alias
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

    // Categorize votes into valid, invalid, and duplicate, with case-insensitive matching
    function categorizeVotes(votes: Vote[], members: Member[], aliases: Alias[]): CategorizedVotes {
        const aliasMap = new Map(aliases.map(alias => [alias.alias.toLowerCase().trim(), alias.vanId]));
        const emailMap = new Map(members
            .filter(member => member.preferredEmail)
            .map(member => [member.preferredEmail.toLowerCase().trim(), member.vanId]));
        // Create map of normalized names (first + last only) to VAN IDs
        const usernameMap = new Map(members
            .filter(member => member.name)
            .map(member => {
                const nameParts = member.name.toLowerCase().trim().split(/\s+/);
                // If only one word, use it as is
                if (nameParts.length === 1) {
                    return [nameParts[0], member.vanId];
                }
                // Otherwise use first and last name only
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                return [`${firstName} ${lastName}`, member.vanId];
            }));

        const votedVanIds = new Set<string>();

        const validVotes: Vote[] = [];
        const invalidVotes: Vote[] = [];
        const duplicateVotes: Vote[] = [];

        votes.forEach(vote => {
            // Normalize vote username to first + last only
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

        // First find the poll title
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip known metadata sections
            if (line === "Overview" || line === "Launched Polls" || line.startsWith("#,Poll Name")) {
                continue;
            }

            // Look for the vote data header pattern - just check the start since the question field can vary
            if (line.startsWith("#,User Name,Email Address,Submitted Date and Time,")) {
                headerIndex = i;
                // Look back for the title (first non-empty line that's not a header)
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
                    // Skip the header row
                    if (idx === 0) {
                        return null;
                    }

                    // Parse CSV line handling quoted fields and escaped quotes
                    const fields: string[] = [];
                    let field = '';
                    let inQuotes = false;
                    let allContent = [line];  // Keep track of all lines that make up this record
                    let currentLineIdx = idx;
                    let currentLine = line;
                    // Account for the header row in line numbers
                    let startLine = headerIndex + idx + 2; // +1 for header, +1 for 1-based line numbers
                    
                    while (true) {
                        for (let i = 0; i < currentLine.length; i++) {
                            const char = currentLine[i];
                            if (char === '"') {
                                if (inQuotes) {
                                    // Check for escaped quote
                                    if (i + 1 < currentLine.length && currentLine[i + 1] === '"') {
                                        field += '"';
                                        i++; // Skip the next quote
                                    } else {
                                        inQuotes = false;
                                        // Skip any content after the closing quote until the next comma
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
                        
                        // If we're still in quotes, look for continuation
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
                    
                    // Show all relevant lines in error messages
                    const fullContent = allContent.join('\n');
                    const lineRange = allContent.length > 1 ? 
                        `Lines ${startLine}-${startLine + allContent.length - 1}` : 
                        `Line ${startLine}`;
                    
                    if (fields.length < 5) {
                        return { error: `${lineRange} has invalid format:\n` +
                                      `"${fullContent}"\n\n` +
                                      `Expected 5 fields (number, name, email, time, vote) but got ${fields.length} fields.` };
                    }

                    // Clean up the fields - remove surrounding quotes and unescape any doubled quotes
                    const cleanFields = fields.map(f => {
                        let cleaned = f.trim();
                        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                            cleaned = cleaned.slice(1, -1);
                        }
                        return cleaned.replace(/""/g, '"');
                    });

                    const [voteNum, username, email, time, vote] = cleanFields;
                    
                    // Parse the vote number to verify it's a number
                    const parsedVoteNum = parseInt(voteNum);
                    if (isNaN(parsedVoteNum)) {
                        return { error: `${lineRange} has invalid vote number:\n` +
                                      `"${fullContent}"\n\n` +
                                      `Vote number "${voteNum}" is not a valid number` };
                    }

                    // Check for missing required fields
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

            // Filter out null (header row) and get any error
            const nonNullVotes = votes.filter((v): v is (Vote | { error: string }) => v !== null);
            const error = nonNullVotes.find(v => 'error' in v);
            if (error) {
                return error;
            }

            // Filter out any invalid votes and cast to Vote type
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
                
                // Re-process existing poll results with new member data
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

            // Re-categorize votes
            const updatedPollResults = pollResults.map(poll => {
                const categorizedVotes = categorizeVotes(poll.votes, memberData, updatedAliases);
                return { ...poll, categorizedVotes, choiceToVotes: summarizeVotes(categorizedVotes.validVotes) };
            });

            setPollResults(updatedPollResults);
        }
    }


  return (
      <main>
          <h1>Upload Members Test</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="file" accept=".txt" onChange={handleMembersUpload}/>
              <button 
                  onClick={() => {
                      setMemberData([]);
                      setPollResults([]);
                      setAliases([]);
                      setSelectedMember(null);
                      setAliasInput("");
                  }}
                  disabled={memberData.length === 0}
              >
                  Reset All Data
              </button>
          </div>
          {memberData.length > 0 && (
              <MaterialReactTable
                  columns={["vanId", "name", "preferredEmail"].map(header => ({header, accessorKey: header}))}
                  data={memberData}
              />
          )}



          <h1>Upload Zoom Poll</h1>
          <input type="file" accept=".csv" onChange={handleZoomUpload} disabled={!memberData.length}/>
          {pollResults.map((poll, index) => (
              <div>
                  <h2>Poll: {poll.name}</h2>
                  <div>
                      <h3>Vote Summary</h3>
                      <table>
                          <thead>
                          <tr>
                              <th>Choice</th>
                              <th>Count</th>
                              <th>% of Valid Votes</th>
                          </tr>
                          </thead>
                          <tbody>
                          {Array.from(poll.choiceToVotes.entries()).map(([vote, count]) => (
                              <tr key={vote}>
                                  <td>{vote}</td>
                                  <td>{count}</td>
                                  <td>{Math.floor((count / poll.categorizedVotes.validVotes.length) * 100)}%</td>
                              </tr>
                          ))}
                          </tbody>
                      </table>
                  </div>
                  <div>
                      <p>There were <b>{poll.votes.length}</b> total votes,
                          <b>{poll.categorizedVotes.validVotes.length}</b> valid votes,
                          <b>{poll.categorizedVotes.invalidVotes.length}</b> invalid votes, and
                          <b>{poll.categorizedVotes.duplicateVotes.length}</b> duplicates</p>
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
                                      <button onClick={() => openAliasModal(row.original.username)}>
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

          <h1>Aliases</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
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
                          backgroundColor: !aliasInput || !selectedMember ? '#ccc' : '#007bff',
                          color: 'white',
                          cursor: !aliasInput || !selectedMember ? 'not-allowed' : 'pointer'
                      }}
                  >
                      Add Alias
                  </button>
              </div>
          </div>
          <h2>Aliases</h2>
          {aliases.length > 0 ? (
              <MaterialReactTable
                  columns={["vanId", "alias"].map(header => ({header, accessorKey: header}))}
                  data={aliases}
              />
          ) : (
              <p>No aliases!</p>
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
                              backgroundColor: !prefilledAlias || !selectedMember ? '#ccc' : '#007bff',
                              color: 'white',
                              cursor: !prefilledAlias || !selectedMember ? 'not-allowed' : 'pointer'
                          }}
                      >
                          Add Alias
                      </button>
                  </div>
              </div>
          </Modal>

      </main>
  );
}
