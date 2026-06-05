import { describe, expect, test } from "bun:test";
import { createBridgeState } from "../../src/bridge/bridge-state";
import { createTableauMcpRuntime } from "../../src/mcp/bridge-runtime";

describe("createTableauMcpRuntime", () => {
  test("enlaza el bridge real con el runtime MCP", async () => {
    const bridge = createBridgeState(() => "2026-06-05T00:00:00.000Z");
    bridge.setLiveContext({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [],
      parameters: [],
    });

    const runtime = createTableauMcpRuntime(bridge);

    await expect(runtime.getLiveContext()).resolves.toEqual({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [],
      parameters: [],
    });

    await expect(
      runtime.applyFilter({
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      }),
    ).resolves.toEqual({ ok: true });

    expect(bridge.getPendingCommands()).toEqual([
      {
        type: "apply_filter",
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      },
    ]);
  });
});
