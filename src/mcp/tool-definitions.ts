import type { TableauLiveContext } from "../bridge/bridge-state";
import type { TableauApplyFilterRequest } from "../tools/tableau-tool-runtime";

export type TableauMcpToolRuntime = {
  getLiveContext(): Promise<TableauLiveContext | null>;
  applyFilter(request: TableauApplyFilterRequest): Promise<{ ok: true }>;
};

export type TableauMcpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: unknown;
};

export type TableauMcpToolDefinition = {
  name: "tableau_get_live_context" | "tableau_apply_filter";
  description: string;
  handler(input: Record<string, unknown>): Promise<TableauMcpToolResult>;
};

export function buildTableauMcpToolDefinitions(runtime: TableauMcpToolRuntime): TableauMcpToolDefinition[] {
  return [
    {
      name: "tableau_get_live_context",
      description: "Lee el contexto activo del dashboard abierto en Tableau Desktop.",
      async handler() {
        const context = await runtime.getLiveContext();
        if (!context) {
          return {
            content: [{ type: "text", text: "No hay dashboard activo conectado." }],
            structuredContent: { ok: false, dashboardName: null },
          };
        }

        return {
          content: [{ type: "text", text: `Dashboard activo: ${context.dashboardName}` }],
          structuredContent: {
            ok: true,
            dashboardName: context.dashboardName,
            worksheets: context.worksheets,
            filters: context.filters,
            parameters: context.parameters,
          },
        };
      },
    },
    {
      name: "tableau_apply_filter",
      description: "Aplica un filtro al dashboard activo mediante el bridge local.",
      async handler(input: Record<string, unknown>) {
        const fieldName = String(input.fieldName ?? "");
        const values = Array.isArray(input.values) ? input.values.map((value) => String(value)) : [];
        const updateType = String(input.updateType ?? "REPLACE") as TableauApplyFilterRequest["updateType"];

        await runtime.applyFilter({
          fieldName,
          values,
          updateType,
        });

        return {
          content: [{ type: "text", text: `Filtro aplicado: ${fieldName}` }],
          structuredContent: { ok: true },
        };
      },
    },
  ];
}
