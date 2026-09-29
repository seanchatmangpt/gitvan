import { defineCommand } from 'citty';
import { readFile } from 'node:fs/promises';
import { stdin } from 'node:process';
import {
  SWARM_OCEL_NOTES_REF,
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from '../../swarm/receipt-service.mjs';
import { runSwarmMcpServer } from '../../mcp/swarm-server.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readDocument(path) {
  return path === '-' ? readStdin() : readFile(path, 'utf8');
}

const appendCommand = defineCommand({
  meta: {
    name: 'append',
    description: 'Attach an OCEL 2.0 receipt to an exact Git commit',
  },
  args: {
    file: {
      type: 'positional',
      description: 'OCEL JSON path, or - for stdin',
      required: true,
    },
    sha: {
      type: 'string',
      description: 'Commit to annotate',
      default: 'HEAD',
    },
    ref: {
      type: 'string',
      description: 'Git notes ref under refs/notes/gitvan/ocel',
      default: SWARM_OCEL_NOTES_REF,
    },
  },
  async run({ args }) {
    const document = await readDocument(args.file);
    const result = await appendSwarmOcelReceipt({
      document,
      sha: args.sha,
      ref: args.ref,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  },
});

const showCommand = defineCommand({
  meta: {
    name: 'show',
    description: 'Read OCEL 2.0 receipts attached to an exact Git commit',
  },
  args: {
    sha: {
      type: 'positional',
      description: 'Commit to inspect',
      default: 'HEAD',
      required: false,
    },
    ref: {
      type: 'string',
      description: 'Git notes ref under refs/notes/gitvan/ocel',
      default: SWARM_OCEL_NOTES_REF,
    },
  },
  async run({ args }) {
    const result = await readSwarmOcelReceipts({ sha: args.sha, ref: args.ref });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  },
});

const receiptCommand = defineCommand({
  meta: { name: 'receipt', description: 'Persist and query swarm OCEL receipts' },
  subCommands: {
    append: appendCommand,
    show: showCommand,
  },
});

const mcpCommand = defineCommand({
  meta: {
    name: 'mcp',
    description: 'Run the least-authority GitVan swarm MCP server over stdio',
  },
  async run() {
    await runSwarmMcpServer();
  },
});

export const swarmCommand = defineCommand({
  meta: {
    name: 'swarm',
    description: 'Git-native bounded interfaces for coding swarms',
  },
  subCommands: {
    receipt: receiptCommand,
    mcp: mcpCommand,
  },
});

export default swarmCommand;
