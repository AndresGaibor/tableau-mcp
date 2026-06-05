import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { registerTableauMcpTools } from "./register-server-tools";
import { createTableauMcpRuntime } from "./bridge-runtime";
import type { BridgeState } from "../bridge/bridge-state";

export function createTableauMcpServer(bridge: BridgeState) {
  const server = new McpServer({ name: "tableau-desktop-mcp", version: "0.1.0" });

  registerTableauMcpTools(server as never, createTableauMcpRuntime(bridge) as never);

  return server;
}

export async function startTableauMcpStdioServer(bridge: BridgeState) {
  const server = createTableauMcpServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function createTableauMcpHttpHandler(bridge: BridgeState) {
  const server = createTableauMcpServer(bridge);
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  return {
    handleRequest: transport.handleRequest.bind(transport),
  };
}
