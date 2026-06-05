import { describe, expect, test } from "bun:test";
import { createBridgeState } from "../../src/bridge/bridge-state";
import { handleBridgeRequest } from "../../src/bridge/bridge-router";

describe("handleBridgeRequest", () => {
  test("responde health y actualiza contexto/eventos", async () => {
    const bridge = createBridgeState(() => "2026-06-05T00:00:00.000Z");

    const health = await handleBridgeRequest({
      method: "GET",
      path: "/healthz",
      body: "",
      bridge,
    });

    expect(health.status).toBe(200);
    expect(health.json).toEqual({ ok: true, service: "tableau-desktop-mcp" });

    const contextResponse = await handleBridgeRequest({
      method: "POST",
      path: "/tableau/context",
      body: JSON.stringify({
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [{ fieldName: "Región", values: ["Costa"] }],
        parameters: [{ name: "Año", value: 2026 }],
      }),
      bridge,
    });

    expect(contextResponse.status).toBe(202);
    expect(bridge.getLiveContext()?.dashboardName).toBe("Ventas Ecuador");

    const eventResponse = await handleBridgeRequest({
      method: "POST",
      path: "/tableau/event",
      body: JSON.stringify({
        type: "filter_changed",
        worksheetName: "Ventas por región",
        fieldName: "Región",
        values: ["Costa"],
      }),
      bridge,
    });

    expect(eventResponse.status).toBe(202);
    expect(bridge.getRecentEvents()).toHaveLength(1);

    const readContext = await handleBridgeRequest({
      method: "GET",
      path: "/tableau/context",
      body: "",
      bridge,
    });

    expect(readContext.status).toBe(200);
    expect(readContext.json).toEqual({
      ok: true,
      context: {
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [{ fieldName: "Región", values: ["Costa"] }],
        parameters: [{ name: "Año", value: 2026 }],
      },
    });
  });
});
