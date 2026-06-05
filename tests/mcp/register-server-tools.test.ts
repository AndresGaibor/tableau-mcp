import { describe, expect, test } from "bun:test";
import { registerTableauMcpTools } from "../../src/mcp/register-server-tools";

describe("registerTableauMcpTools", () => {
  test("registra las tools del MVP en un servidor MCP", async () => {
    const calls: Array<{ name: string; description: string }> = [];

    const server = {
      registerTool(name: string, definition: { description: string }, handler: (input: Record<string, unknown>) => Promise<unknown>) {
        calls.push({ name, description: definition.description });
        void handler;
      },
    };

    registerTableauMcpTools(server as never, {
      getLiveContext: async () => null,
      applyFilter: async () => ({ ok: true }),
    });

    expect(calls).toEqual([
      {
        name: "tableau_get_live_context",
        description: "Lee el contexto activo del dashboard abierto en Tableau Desktop.",
      },
      {
        name: "tableau_apply_filter",
        description: "Aplica un filtro al dashboard activo mediante el bridge local.",
      },
    ]);
  });
});
