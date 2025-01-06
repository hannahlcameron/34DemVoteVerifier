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

  function deleteTodo(id: string) {
      client.models.Todo.delete({id});
  }

  useEffect(() => {
    listTodos();
  }, []);

  function createTodo() {
    client.models.Todo.create({
      content: window.prompt("Todo content"),
    });
  }

    function parseTSV(tsv: string) {
        const lines = tsv.trim().split("\n");
        const headers = ["vanId", "name", "preferredEmail"];
        const data = lines.slice(1).map(line => {
            const values = line.split("\t");
            return {
                vanId: values[0],
                name: values[1],
                preferredEmail: values[2]
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

    function categorizeVotes(votes: Vote[], members: Member[], aliases: Alias[]) : CategorizedVotes
    {
        const aliasMap = new Map(aliases.map(alias => [alias.alias, alias.vanId]));
        const emailMap = new Map(members.map(member => [member.preferredEmail, member.vanId]));
        const usernameMap = new Map(members.map(member => [member.name, member.vanId]));

        const votedVanIds = new Set<string>();

        const validVotes : Vote[] = [];
        const invalidVotes : Vote[] = [];
        const duplicateVotes : Vote[] = [];

        votes.forEach(vote => {
            const vanId = aliasMap.get(vote.username)
                || aliasMap.get(vote.email)
                || emailMap.get(vote.email)
                || usernameMap.get(vote.username);

            if (vanId === undefined) {
                invalidVotes.push(vote);
            } else if (votedVanIds.has(vanId)) {
                duplicateVotes.push(vote);
            } else {
                validVotes.push(vote);
            }
        });

        return { validVotes, invalidVotes, duplicateVotes };
    }

    function parseCSV(csv: string) {
        const blockRegex = /\d+\) (.*)\r\n(?:#.*\r\n)((?:.+\r\n)*)/gm
        const results = [];
        let match;
        while ((match = blockRegex.exec(csv)) !== null) {
            const pollName = match[1];
            const votes = match[2].split("\n")
                .filter(line => line.trim() !== "")
                .map(line => {
                    const [_, username, email, time, vote] = line.split(",");
                    return { username, email, time, choice: vote } as Vote;
                });

            const categorizedVotes = categorizeVotes(votes, memberData, []);
            const summary = summarizeVotes(categorizedVotes.validVotes);

            const pollResult: PollResult = {name: pollName, votes: votes,
                categorizedVotes: categorizedVotes,
                choiceToVotes: summary
            };

            results.push(pollResult);
        }
        return results;
    }

    function handleMembersUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const tsv = e.target?.result as string;
                const parsedData = parseTSV(tsv);
                setMemberData(parsedData);
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
                const parsedResults = parseCSV(csv);
                setPollResults(parsedResults);
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
          <h1>Upload Members</h1>
          <input type="file" accept=".txt" onChange={handleMembersUpload}/>
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
          <input
              type="text"
              value={aliasInput}
              onChange={handleAliasInputChange}
              placeholder="Enter alias"
          />
          <select onChange={handleMemberSelect} value={selectedMember?.vanId || ""}>
              <option value="" disabled>Select member</option>
              {memberData.map(member => (
                  <option key={member.vanId} value={member.vanId}>
                      {member.name} ({member.preferredEmail})
                  </option>
              ))}
          </select>
          <button onClick={createAlias} disabled={!aliasInput || !selectedMember}>
              Add Alias
          </button>
          <h2>Aliases</h2>
          {aliases.length > 0 ? (
              <MaterialReactTable
                  columns={["vanId", "alias"].map(header => ({header, accessorKey: header}))}
                  data={aliases}
              />
          ) : (
              <p>No aliases!</p>
          )}

          <Modal isOpen={isModalOpen} onRequestClose={closeAliasModal}>
              <h2>Create Alias</h2>
              <input
                  type="text"
                  value={prefilledAlias}
                  onChange={(e) => setPrefilledAlias(e.target.value)}
                  placeholder="Enter alias"
              />
              <select onChange={handleMemberSelect} value={selectedMember?.vanId || ""}>
                  <option value="" disabled>Select member</option>
                  {memberData.map(member => (
                      <option key={member.vanId} value={member.vanId}>
                          {member.name} ({member.preferredEmail})
                      </option>
                  ))}
              </select>
              <button onClick={createAliasFromModal} disabled={!prefilledAlias || !selectedMember}>
                  Add Alias
              </button>
              <button onClick={closeAliasModal}>Cancel</button>
          </Modal>

      </main>
  );
}
