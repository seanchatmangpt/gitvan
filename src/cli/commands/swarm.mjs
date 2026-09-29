import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";
import { stdin } from "node:process";
import {
  SWARM_OCEL_NOTES_REF,
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from "../../swarm/receipt-service.mjs";
import { admitGatewayToolInput } from "../../swarm/gateway/tool-contract.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readDocument(path) {
  return path === "-" ? readStdin() : readFile(path, "utf8");
}

function exactArgs() {
  return {
    repository: {
      type: "string",
      description: "Exact GitHub owner/name repository identity",
      required: true,
    },
    commit: {
      type: "string",
      description: "Exact lowercase 40-hex commit SHA",
      required: true,
    },
    ref: {
      type: "string",
      description: "Bounded Git notes ref under refs/notes/gitvan/ocel",
      default: SWARM_OCEL_NOTES_REF,
    },
  };
}

export const swarmReceiptAppendCommand = defineCommand({
  meta: {
    name: "append",
    description: "Attach an OCEL receipt to one exact repository+commit subject",
  },
  args: {
    file: {
      type: "positional",
      description: "OCEL JSON path, or - for stdin",
      required: true,
    },
    ...exactArgs(),
  },
  async run({ args }) {
    const exact = admitGatewayToolInput(args);
    const document = await readDocument(args.file);
    const result = await appendSwarmOcelReceipt({
      document,
      ...exact,
      authority: "RECEIPT_APPEND",
    });
    process.stdout.write(JSON.stringify(result) + "\n");
  },
});

export const swarmReceiptShowCommand = defineCommand({
  meta: {
    name: "show",
    description: "Read OCEL receipts from one exact repository+commit subject",
  },
  args: exactArgs(),
  async run({ args }) {
    const exact = admitGatewayToolInput(args);
    const result = await readSwarmOcelReceipts({
      ...exact,
      authority: "OBSERVE",
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  },
});

const receiptCommand = defineCommand({
  meta: {
    name: "receipt",
    description: "Persist and query exact-subject swarm receipts",
  },
  subCommands: {
    append: swarmReceiptAppendCommand,
    show: swarmReceiptShowCommand,
  },
});

const mcpCommand = defineCommand({
  meta: {
    name: "mcp",
    description: "Run the least-authority GitVan swarm MCP server over stdio",
  },
  async run() {
    const { runSwarmMcpServer } = await import("../../mcp/swarm-server.mjs");
    await runSwarmMcpServer();
  },
});

export const swarmCommand = defineCommand({
  meta: {
    name: "swarm",
    description: "Bounded Git-native interfaces for coding swarms",
  },
  subCommands: {
    receipt: receiptCommand,
    mcp: mcpCommand,
  },
});

export default swarmCommand;
