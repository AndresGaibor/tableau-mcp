import { buildTableauMcpManifest } from "./shared/manifest";
import { createBridgeState } from "./bridge/bridge-state";
import { startBridgeHttpServer } from "./bridge/http-server";
import { createTableauMcpHttpHandler, startTableauMcpStdioServer } from "./mcp/server";
import { buildStartPlan } from "./runtime/start-plan";

async function main() {
  const plan = buildStartPlan(process.env);
  const manifest = buildTableauMcpManifest();
  const bridge = createBridgeState();
  const mode = process.env.TABLEAU_MCP_MODE ?? "http";

  if (mode === "http") {
    const mcpHandler = await createTableauMcpHttpHandler(bridge);
    const bridgeServer = await startBridgeHttpServer({
      bridge,
      host: plan.bridgeHost,
      port: plan.bridgePort,
      mcpPath: "/mcp",
      handleMcpRequest: mcpHandler.handleRequest,
    });

    console.error(`Bridge local listo en ${bridgeServer.url}`);
    console.error(`MCP listo en ${bridgeServer.url}/mcp como ${manifest.name}`);
    return;
  }

  const bridgeServer = await startBridgeHttpServer({
    bridge,
    host: plan.bridgeHost,
    port: plan.bridgePort,
  });

  console.error(`Bridge local listo en ${bridgeServer.url}`);
  console.error(`MCP listo en stdio como ${manifest.name}`);

  await startTableauMcpStdioServer(bridge);
}

void main();
