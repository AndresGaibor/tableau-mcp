import { describe, expect, test } from "bun:test";
import { collectTableauLiveContext } from "./collect-tableau-live-context";

describe("collectTableauLiveContext", () => {
  test("extrae nombre, worksheets, filtros y parámetros del dashboard", async () => {
    const dashboard = {
      name: "Ventas Ecuador",
      worksheets: [
        {
          name: "Ventas por región",
          getFiltersAsync: async () => ([
            { name: "Región", type: "categorical" },
          ]),
          getParametersAsync: async () => ([
            { name: "Año", value: 2026 },
          ]),
        },
      ],
    };

    await expect(collectTableauLiveContext(dashboard as never)).resolves.toEqual({
      dashboardName: "Ventas Ecuador",
      worksheets: [{ name: "Ventas por región" }],
      filters: [{ worksheetName: "Ventas por región", fieldName: "Región", type: "categorical" }],
      parameters: [{ name: "Año", value: 2026 }],
    });
  });
});
