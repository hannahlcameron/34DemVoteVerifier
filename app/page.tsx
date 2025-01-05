"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { MaterialReactTable } from "material-react-table";

Amplify.configure(outputs);

const client = generateClient<Schema>();

type PollResult = { name: string; lines: string[] };

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [memberData, setMemberData] = useState<{ headers: string[], data: Record<string, string>[] } | null>(null);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);


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
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {} as Record<string, string>);
        });
        return { headers, data };
    }

    function parseCSV(csv: string) {
        //const blockRegex = /\d+\) ((.*)\n(?:#.*\n)(.+\n)*)/gm
        const blockRegex = /\d+\) (.*)\r\n(?:#.*\r\n)((?:.+\r\n)*)/gm
        const results = [];
        let match;
        while ((match = blockRegex.exec(csv)) !== null) {
            const pollName = match[1];
            const pollLines = match[2].split("\n").filter(line => line.trim() !== "");
            //const pollLines = ["1", "2"];
            results.push({ name: pollName, lines: pollLines });
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
                //const blockRegex = /.*/g
                const parsedResults = parseCSV(csv);
                setPollResults(parsedResults);
            };
            reader.readAsText(file);
        }
    }

  return (
    <main>
      <h1>Upload Voters</h1>
        <input type="file" accept=".txt" onChange={handleMembersUpload} />
        {memberData && (
            <MaterialReactTable
                columns={memberData.headers.map(header => ({ header, accessorKey: header }))}
                data={memberData.data}
            />
        )}

        <h1>Upload Voters</h1>
        <input type="file" accept=".csv" onChange={handleZoomUpload} />
        Results -
        {pollResults.map((poll, index) => (
            <div key={index} className="vote-block">
                Name:
                {poll.name}
                Lines:
                <ol>
                    {poll.lines.map((line, index) => (
                        <li key={index}>{line}</li>
                        ))}
                </ol>
            </div>
        ))}
        end results

      {/*<button onClick={createTodo}>+ new</button>*/}
      {/*<ul>*/}
      {/*  {todos.map((todo) => (*/}
      {/*    <li*/}
      {/*        onClick={() => deleteTodo(todo.id)}*/}
      {/*        key={todo.id}>*/}
      {/*        {todo.content}*/}
      {/*    </li>*/}
      {/*  ))}*/}
      {/*</ul>*/}
      {/*<div>*/}
      {/*  🥳 App successfully hosted. Try creating a new todo.*/}
      {/*  <br />*/}
      {/*  <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">*/}
      {/*    Review next steps of this tutorial.*/}
      {/*  </a>*/}
      {/*</div>*/}
    </main>
  );
}
