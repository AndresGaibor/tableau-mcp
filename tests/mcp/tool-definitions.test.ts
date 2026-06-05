import { describe, expect, test } from "bun:test";
import { buildTableauMcpToolDefinitions } from "../../src/mcp/tool-definitions";

describe("buildTableauMcpToolDefinitions", () => {
  test("expone las tools del MVP con handlers funcionales", async () => {
    const definitions = buildTableauMcpToolDefinitions({
      getLiveContext: async () => ({
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [{ fieldName: "Región", values: ["Costa"] }],
        parameters: [{ name: "Año", value: 2026 }],
      }),
      applyFilter: async () => ({ ok: true }),
    });

    expect(definitions.map((definition) => definition.name)).toEqual([
      "tableau_get_live_context",
      "tableau_apply_filter",
    ]);

    await expect(definitions[0].handler({})).resolves.toEqual({
      content: [{ type: "text", text: "Dashboard activo: Ventas Ecuador" }],
      structuredContent: {
        ok: true,
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [{ fieldName: "Región", values: ["Costa"] }],
        parameters: [{ name: "Año", value: 2026 }],
      },
    });

    await expect(
      definitions[1].handler({
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      }),
    ).resolves.toEqual({
      content: [{ type: "text", text: "Filtro aplicado: Región" }],
      structuredContent: { ok: true },
    });
  });
});
