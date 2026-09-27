/**
 * Least-authority MCP surface for swarm receipts.
 *
 * The MCP caller never receives Git credentials. This process runs in the
 * authorized GitVan environment and exposes only receipt-note operations.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  SWARM_OCEL_NOTES_REF,
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from '../swarm/receipt-service.mjs';

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

export function createSwarmMcpServer() {
  const server = new McpServer({
    name: 'gitvan-swarm',
    version: '1',
  });

  server.registerTool(
    'swarm_receipt_append',
    {
      description: 'Attach an OCEL 2.0 swarm receipt to an exact Git commit using the authorized GitVan notes namespace.',
      inputSchema: {
        document: z.string().describe('Compact or pretty OCEL 2.0 JSON document'),
        sha: z.string().default('HEAD').optional(),
        ref: z.string().default(SWARM_OCEL_NOTES_REF).optional(),
      },
    },
    async ({ document, sha, ref }) => textResult(
      await appendSwarmOcelReceipt({ document, sha, ref }),
    ),
  );

  server.registerTool(
    'swarm_receipt_show',
    {
      description: 'Read OCEL 2.0 swarm receipts attached to an exact Git commit.',
      inputSchema: {
        sha: z.string().default('HEAD').optional(),
        ref: z.string().default(SWARM_OCEL_NOTES_REF).optional(),
      },
    },
    async ({ sha, ref }) => textResult(
      await readSwarmOcelReceipts({ sha, ref }),
    ),
  );

  return server;
}

export async function runSwarmMcpServer() {
  const server = createSwarmMcpServer();
  await server.connect(new StdioServerTransport());
  return server;
}
