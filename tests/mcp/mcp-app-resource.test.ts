import { describe, expect, test } from "bun:test";
import { buildMcpAppResourcePayload } from "../../src/mcp/mcp-app-resource";

describe("buildMcpAppResourcePayload", () => {
  test("inyecta metadatos y devuelve el recurso mcp-app", () => {
    const payload = buildMcpAppResourcePayload({
      appId: "mcp-app",
      appTitle: "Tableau MCP App",
      appDescription: "Panel visual para Tableau",
      htmlContent: "<!doctype html><html><head><title>Tableau MCP App</title></head><body><div id=\"root\"></div></body></html>",
    });

    expect(payload.title).toBe("Tableau MCP App");
    expect(payload.description).toBe("Panel visual para Tableau");
    expect(payload.mimeType).toBe("text/html;profile=mcp-app");
    expect(payload.contents[0]?.uri).toBe("ui://tableau-mcp/mcp-app.html");
    const htmlContent = payload.contents[0] as { text: string; _meta: { [key: string]: unknown } };
    expect(htmlContent.text).toContain('meta name="app-id" content="mcp-app"');
    expect(htmlContent._meta["openai/widgetDescription"]).toBe("Panel visual para Tableau");
  });

  test("empaqueta assets referenciados por el html", () => {
    const payload = buildMcpAppResourcePayload({
      appId: "mcp-app",
      appTitle: "Tableau MCP App",
      appDescription: "Panel visual para Tableau",
      htmlContent: "<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width\" /><link rel=\"stylesheet\" href=\"/assets/index.css\" /></head><body><script type=\"module\" src=\"/assets/index.js\"></script></body></html>",
      readAsset: (assetPath) => {
        if (assetPath.endsWith("index.js")) return new TextEncoder().encode("console.log('ok')");
        if (assetPath.endsWith("index.css")) return new TextEncoder().encode("body{color:red}");
        return null;
      },
    });

    expect(payload.contents).toHaveLength(3);
    expect(payload.contents[1]?.uri).toBe("ui://tableau-mcp/assets/index.css");
    expect(payload.contents[2]?.uri).toBe("ui://tableau-mcp/assets/index.js");
  });
});
