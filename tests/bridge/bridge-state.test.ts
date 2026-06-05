import { describe, expect, test } from "bun:test";
import { createBridgeState } from "../../src/bridge/bridge-state";

describe("createBridgeState", () => {
  test("guarda el contexto vivo y los eventos recientes", () => {
    const bridge = createBridgeState(() => "2026-06-05T00:00:00.000Z");

    expect(bridge.getLiveContext()).toBeNull();

    bridge.setLiveContext({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [{ fieldName: "Región", values: ["Costa"] }],
      parameters: [{ name: "Año", value: 2026 }],
    });

    bridge.recordEvent({
      type: "filter_changed",
      worksheetName: "Ventas por región",
      fieldName: "Región",
      values: ["Costa"],
    });

    expect(bridge.getLiveContext()).toEqual({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [{ fieldName: "Región", values: ["Costa"] }],
      parameters: [{ name: "Año", value: 2026 }],
    });

    expect(bridge.getRecentEvents()).toEqual([
      {
        receivedAt: "2026-06-05T00:00:00.000Z",
        type: "filter_changed",
        worksheetName: "Ventas por región",
        fieldName: "Región",
        values: ["Costa"],
      },
    ]);
  });

  test("encola y vacia comandos pendientes", () => {
    const bridge = createBridgeState(() => "2026-06-05T00:00:00.000Z");

    bridge.queueCommand({
      type: "apply_filter",
      fieldName: "Región",
      values: ["Costa"],
      updateType: "REPLACE",
    });

    expect(bridge.getPendingCommands()).toEqual([
      {
        type: "apply_filter",
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      },
    ]);

    expect(bridge.drainPendingCommands()).toEqual([
      {
        type: "apply_filter",
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      },
    ]);

    expect(bridge.getPendingCommands()).toEqual([]);
  });
});
