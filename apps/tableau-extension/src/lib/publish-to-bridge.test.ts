import { describe, expect, test } from "bun:test";
import { publishTableauContextToBridge } from "./publish-to-bridge";

describe("publishTableauContextToBridge", () => {
  test("envía el contexto al endpoint /tableau/context", async () => {
    const llamadas: Array<{ url: string; init?: RequestInit }> = [];

    const response = await publishTableauContextToBridge({
      bridgeUrl: "http://127.0.0.1:3937",
      context: {
        dashboardName: "Ventas Ecuador",
        worksheets: [{ name: "Ventas por región" }],
        filters: [],
        parameters: [],
      },
      fetchImpl: async (url, init) => {
        llamadas.push({ url: String(url), init });
        return new Response(JSON.stringify({ ok: true }), { status: 202 });
      },
    });

    expect(response.ok).toBe(true);
    expect(llamadas).toEqual([
      {
        url: "http://127.0.0.1:3937/tableau/context",
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            dashboardName: "Ventas Ecuador",
            worksheets: [{ name: "Ventas por región" }],
            filters: [],
            parameters: [],
          }),
        },
      },
    ]);
  });
});
