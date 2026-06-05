import { buildTableauMcpToolDefinitions, type TableauMcpToolRuntime } from "./tool-definitions";

export type TableauMcpServerLike = {
  registerTool(
    name: string,
    definition: { description: string },
    handler: (input: Record<string, unknown>) => Promise<unknown>,
  ): void;
};

export function registerTableauMcpTools(server: TableauMcpServerLike, runtime: TableauMcpToolRuntime): void {
  for (const definition of buildTableauMcpToolDefinitions(runtime)) {
    server.registerTool(definition.name, { description: definition.description }, definition.handler);
  }
}
