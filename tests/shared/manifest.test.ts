import { describe, expect, test } from "bun:test";
import { buildTableauMcpManifest } from "../../src/shared/manifest";

describe("buildTableauMcpManifest", () => {
  test("expone la base del MCP para Tableau", () => {
    const manifest = buildTableauMcpManifest();

    expect(manifest.name).toBe("tableau-desktop-mcp");
    expect(manifest.server.host).toBe("127.0.0.1");
    expect(manifest.server.healthPath).toBe("/healthz");
    expect(manifest.surfaces.map((surface) => surface.id)).toEqual([
      "tableau-extension",
      "mcp-app",
    ]);
    expect(manifest.tools).toEqual([
      "tableau_get_live_context",
      "tableau_apply_filter",
    ]);
  });
});
