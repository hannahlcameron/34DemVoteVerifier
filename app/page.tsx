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

export default function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [tableData, setTableData] = useState<{ headers: string[], data: Record<string, string>[] } | null>(null);

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

    function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const tsv = e.target?.result as string;
                const parsedData = parseTSV(tsv);
                setTableData(parsedData);
            };
            reader.readAsText(file);
        }
    }

  return (
    <main>
      <h1>Upload Voters</h1>
        <input type="file" accept=".txt" onChange={handleFileUpload} />
        {tableData && (
            <MaterialReactTable
                columns={tableData.headers.map(header => ({ header, accessorKey: header }))}
                data={tableData.data}
            />
        )}

     <h1></h1>

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
