import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { EXACT_COMMIT } from "../swarm/conformance/identity.mjs";
import {
  SWARM_OCEL_NOTES_REF,
  appendSwarmOcelReceipt,
  readSwarmOcelReceipts,
} from "../swarm/receipt-service.mjs";

const repositorySchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
const commitSchema = z.string().regex(EXACT_COMMIT);
const refSchema = z.string().default(SWARM_OCEL_NOTES_REF);

export const swarmMcpInputSchemas = Object.freeze({
  append: z.object({
    document: z.string(),
    repository: repositorySchema,
    commit: commitSchema,
    ref: refSchema.optional(),
  }),
  show: z.object({
    repository: repositorySchema,
    commit: commitSchema,
    ref: refSchema.optional(),
  }),
});

function textResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
  };
}

function errorResult(error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({
          code: error?.code || "swarm_gateway_failed",
          message: error?.message || String(error),
        }),
      },
    ],
  };
}

export function createSwarmMcpServer() {
  const server = new McpServer({
    name: "gitvan-swarm",
    version: "2",
  });

  server.registerTool(
    "swarm_receipt_append",
    {
      description:
        "Append one OCEL interchange receipt to an exact repository+commit using receipt-only Git Notes authority.",
      inputSchema: swarmMcpInputSchemas.append,
    },
    async (input) => {
      try {
        return textResult(
          await appendSwarmOcelReceipt({
            ...input,
            authority: "RECEIPT_APPEND",
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "swarm_receipt_show",
    {
      description:
        "Read OCEL interchange receipts from one exact repository+commit subject.",
      inputSchema: swarmMcpInputSchemas.show,
    },
    async (input) => {
      try {
        return textResult(
          await readSwarmOcelReceipts({
            ...input,
            authority: "OBSERVE",
          }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}

export async function runSwarmMcpServer() {
  const server = createSwarmMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
