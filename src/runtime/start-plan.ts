export type StartPlan = {
  bridgePort: number;
  bridgeHost: string;
  healthUrl: string;
  serverCommand: [string, string, string];
};

export function buildStartPlan(env: Record<string, string | undefined>): StartPlan {
  const bridgePort = Number(env.TABLEAU_MCP_BRIDGE_PORT || env.TABLEAU_MCP_PORT || 3937) || 3937;

  return {
    bridgePort,
    bridgeHost: env.TABLEAU_MCP_HOST || "127.0.0.1",
    healthUrl: `http://127.0.0.1:${bridgePort}/healthz`,
    serverCommand: ["bun", "run", "src/index.ts"],
  };
}
