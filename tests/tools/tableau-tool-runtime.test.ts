import { describe, expect, test } from "bun:test";
import { createTableauToolRuntime } from "../../src/tools/tableau-tool-runtime";

describe("createTableauToolRuntime", () => {
  test("devuelve el contexto vivo", async () => {
    const runtime = createTableauToolRuntime({
      getLiveContext: () => ({
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [{ fieldName: "Región", values: ["Costa"] }],
        parameters: [{ name: "Año", value: 2026 }],
      }),
      applyFilter: async () => ({ ok: true }),
    });

    await expect(runtime.getLiveContext()).resolves.toEqual({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [{ fieldName: "Región", values: ["Costa"] }],
      parameters: [{ name: "Año", value: 2026 }],
    });
  });

  test("aplica un filtro en el bridge", async () => {
    const calls: Array<unknown> = [];
    const runtime = createTableauToolRuntime({
      getLiveContext: () => null,
      applyFilter: async (command) => {
        calls.push(command);
        return { ok: true };
      },
    });

    await expect(
      runtime.applyFilter({
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      }),
    ).resolves.toEqual({ ok: true });

    expect(calls).toEqual([
      {
        fieldName: "Región",
        values: ["Costa"],
        updateType: "REPLACE",
      },
    ]);
  });
});
