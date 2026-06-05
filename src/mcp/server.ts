import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { registerTableauMcpTools } from "./register-server-tools";
import { createTableauMcpRuntime } from "./bridge-runtime";
import type { BridgeState } from "../bridge/bridge-state";
import { buildMcpAppResourcePayload, resolveMcpAppAsset, resolveMcpAppHtml } from "./mcp-app-resource";
import { buildStartPlan } from "../runtime/start-plan";

export function createTableauMcpServer(bridge: BridgeState) {
  const server = new McpServer({ name: "tableau-desktop-mcp", version: "0.1.0" });
  const plan = buildStartPlan(process.env);

  registerTableauMcpTools(server as never, createTableauMcpRuntime(bridge) as never);

  const resource = buildMcpAppResourcePayload({
    appId: "mcp-app",
    appTitle: "Tableau MCP App",
    appDescription: "Panel visual para inspeccionar el dashboard activo de Tableau.",
    htmlContent: resolveMcpAppHtml(),
    readAsset: resolveMcpAppAsset,
    connectDomains: [`http://${plan.bridgeHost}:${plan.bridgePort}`, `http://localhost:${plan.bridgePort}`],
  });

  server.registerResource(
    "mcp-app",
    `ui://tableau-mcp/mcp-app.html`,
    {
      title: resource.title,
      description: resource.description,
      mimeType: resource.mimeType,
    },
    async () => ({ contents: resource.contents }),
  );

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
