import { describe, expect, test } from "bun:test";
import { bootstrapTableauExtension } from "./bootstrap-tableau-extension";

describe("bootstrapTableauExtension", () => {
  test("sincroniza contexto y registra listeners de filtros y parámetros", async () => {
    const listeners: string[] = [];
    const parameterListeners: string[] = [];
    let initializeCount = 0;
    let postCount = 0;

    const extension = {
      initializeAsync: async () => {
        initializeCount += 1;
      },
      dashboardContent: {
        dashboard: {
          name: "Ventas Ecuador",
          worksheets: [
            {
              name: "Ventas por región",
              getFiltersAsync: async () => ([{ name: "Región", type: "categorical" }]),
              getParametersAsync: async () => ([{ name: "Año", value: 2026 }]),
              addEventListener: (eventType: string, handler: () => void) => {
                listeners.push(eventType);
                void handler;
                return () => undefined;
              },
            },
          ],
          findParameterAsync: async (name: string) => ({
            name,
            addEventListener: (eventType: string, handler: () => void) => {
              parameterListeners.push(eventType);
              void handler;
              return () => undefined;
            },
          }),
          addEventListener: () => () => undefined,
        },
      },
    };

    await bootstrapTableauExtension({
      tableauApi: extension as never,
      bridgeUrl: "http://127.0.0.1:3937",
      fetchImpl: async () => {
        postCount += 1;
        return new Response(JSON.stringify({ ok: true }), { status: 202 });
      },
    });

    expect(initializeCount).toBe(1);
    expect(postCount).toBe(1);
    expect(listeners).toEqual([
      "filter-changed",
      "mark-selection-changed",
      "summary-data-changed",
    ]);
    expect(parameterListeners).toEqual(["parameter-changed"]);
  });
});
