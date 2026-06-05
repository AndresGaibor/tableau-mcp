export type TableauMcpSurface = {
  id: "tableau-extension" | "mcp-app";
  title: string;
  description: string;
};

export type TableauMcpManifest = {
  name: string;
  server: {
    host: string;
    port: number;
    healthPath: string;
    mcpPath: string;
  };
  surfaces: TableauMcpSurface[];
  tools: string[];
  allowedOrigins: string[];
  allowedWorkspacePaths: string[];
};

export function buildTableauMcpManifest(): TableauMcpManifest {
  return {
    name: "tableau-desktop-mcp",
    server: {
      host: "127.0.0.1",
      port: 3937,
      healthPath: "/healthz",
      mcpPath: "/mcp",
    },
    surfaces: [
      {
        id: "tableau-extension",
        title: "Tableau Desktop Extension",
        description: "UI local dentro de Tableau Desktop para inspeccionar el dashboard activo.",
      },
      {
        id: "mcp-app",
        title: "ChatGPT MCP App",
        description: "UI en ChatGPT para inspeccionar y controlar Tableau mediante MCP Apps.",
      },
    ],
    tools: ["tableau_get_live_context", "tableau_apply_filter"],
    allowedOrigins: ["http://localhost:*", "http://127.0.0.1:*"],
    allowedWorkspacePaths: [
      "~/Documents/My Tableau Repository/",
      "~/Documents/Tableau MCP Workspace/",
    ],
  };
}
